from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from messaging.models import Conversation
from .models import Call
from .serializers import CallSerializer


class CallViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CallSerializer

    def _member_call(self, request, pk):
        return get_object_or_404(
            Call.objects.select_related("conversation", "caller", "receiver").filter(
                Q(caller=request.user) | Q(receiver=request.user)
            ),
            pk=pk,
        )

    def retrieve(self, request, pk=None):
        return Response(CallSerializer(self._member_call(request, pk)).data)

    def list(self, request):
        qs = Call.objects.select_related("conversation", "caller", "receiver").filter(
            Q(caller=request.user) | Q(receiver=request.user)
        )
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        conversation_id = request.query_params.get("conversation")
        if conversation_id:
            qs = qs.filter(conversation_id=conversation_id)
        return Response(CallSerializer(qs[:25], many=True).data)

    def create(self, request):
        conversation_id = request.data.get("conversation")
        offer = request.data.get("offer")
        if not conversation_id or not isinstance(offer, dict):
            return Response({"detail": "conversation and a WebRTC offer are required."}, status=status.HTTP_400_BAD_REQUEST)
        conversation = get_object_or_404(
            Conversation.objects.select_related("buyer", "seller"),
            pk=conversation_id,
        )
        if request.user.id not in (conversation.buyer_id, conversation.seller_id):
            return Response({"detail": "You are not a member of this conversation."}, status=status.HTTP_403_FORBIDDEN)
        receiver = conversation.seller if conversation.buyer_id == request.user.id else conversation.buyer
        # Only one active call per conversation. End stale active calls before ringing the other user.
        with transaction.atomic():
            Call.objects.filter(
                conversation=conversation,
                status__in=[Call.Status.RINGING, Call.Status.ACCEPTED],
            ).update(status=Call.Status.ENDED)
            call = Call.objects.create(
                conversation=conversation,
                caller=request.user,
                receiver=receiver,
                offer=offer,
                status=Call.Status.RINGING,
            )
        return Response(CallSerializer(call).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def incoming(self, request):
        cutoff = timezone.now() - timedelta(seconds=60)
        qs = Call.objects.select_related("conversation", "caller", "receiver").filter(
            receiver=request.user,
            status=Call.Status.RINGING,
            created_at__gte=cutoff,
        ).order_by("created_at")[:10]
        return Response(CallSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        call = self._member_call(request, pk)
        if call.receiver_id != request.user.id:
            return Response({"detail": "Only the receiver can accept this call."}, status=status.HTTP_403_FORBIDDEN)
        if call.status != Call.Status.RINGING:
            return Response(CallSerializer(call).data)
        answer = request.data.get("answer")
        if not isinstance(answer, dict):
            return Response({"detail": "A WebRTC answer is required."}, status=status.HTTP_400_BAD_REQUEST)
        call.answer = answer
        call.status = Call.Status.ACCEPTED
        call.save(update_fields=["answer", "status", "updated_at"])
        return Response(CallSerializer(call).data)

    @action(detail=True, methods=["post"])
    def signal(self, request, pk=None):
        call = self._member_call(request, pk)
        if call.status in [Call.Status.DECLINED, Call.Status.ENDED]:
            return Response({"detail": "Call has ended."}, status=status.HTTP_409_CONFLICT)
        candidate = request.data.get("candidate")
        if not isinstance(candidate, dict):
            return Response({"detail": "A WebRTC ICE candidate is required."}, status=status.HTTP_400_BAD_REQUEST)
        candidates = list(call.ice_candidates or [])
        candidate_id = request.data.get("candidate_id") or len(candidates)
        candidates.append({"id": candidate_id, "sender": request.user.id, "candidate": candidate})
        call.ice_candidates = candidates
        call.save(update_fields=["ice_candidates", "updated_at"])
        return Response({"ok": True, "id": candidate_id})

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        call = self._member_call(request, pk)
        if call.receiver_id != request.user.id:
            return Response({"detail": "Only the receiver can decline this call."}, status=status.HTTP_403_FORBIDDEN)
        if call.status not in [Call.Status.RINGING]:
            return Response(CallSerializer(call).data)
        call.status = Call.Status.DECLINED
        call.save(update_fields=["status", "updated_at"])
        return Response(CallSerializer(call).data)

    @action(detail=True, methods=["post"])
    def end(self, request, pk=None):
        call = self._member_call(request, pk)
        if call.status not in [Call.Status.DECLINED, Call.Status.ENDED]:
            call.status = Call.Status.ENDED
            call.save(update_fields=["status", "updated_at"])
        return Response(CallSerializer(call).data)
