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

    def _expire_missed(self):
        """A ringing call that has not been answered for 60 seconds becomes missed."""
        now = timezone.now()
        cutoff = now - timedelta(seconds=60)
        Call.objects.filter(status=Call.Status.RINGING, created_at__lt=cutoff).update(
            status=Call.Status.MISSED, ended_at=now
        )

    def _serialize(self, call, request):
        return CallSerializer(call, context={"request": request}).data

    def retrieve(self, request, pk=None):
        self._expire_missed()
        return Response(self._serialize(self._member_call(request, pk), request))

    def list(self, request):
        self._expire_missed()
        qs = Call.objects.select_related("conversation", "caller", "receiver").filter(
            Q(caller=request.user) | Q(receiver=request.user)
        )
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        conversation_id = request.query_params.get("conversation")
        if conversation_id:
            qs = qs.filter(conversation_id=conversation_id)
        return Response(CallSerializer(qs[:50], many=True, context={"request": request}).data)

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
        now = timezone.now()
        with transaction.atomic():
            active_calls = Call.objects.select_for_update().filter(
                conversation=conversation,
                status__in=[Call.Status.RINGING, Call.Status.ACCEPTED],
            )
            for active in active_calls:
                if active.status == Call.Status.RINGING:
                    active.status = Call.Status.MISSED
                else:
                    active.ended_at = active.ended_at or now
                active.save(update_fields=["status", "ended_at", "updated_at"])
            call = Call.objects.create(
                conversation=conversation,
                caller=request.user,
                receiver=receiver,
                offer=offer,
                status=Call.Status.RINGING,
            )
        return Response(self._serialize(call, request), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def incoming(self, request):
        self._expire_missed()
        qs = Call.objects.select_related("conversation", "caller", "receiver").filter(
            receiver=request.user,
            status=Call.Status.RINGING,
            created_at__gte=timezone.now() - timedelta(seconds=60),
        ).order_by("created_at")[:10]
        return Response(CallSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        call = self._member_call(request, pk)
        if call.receiver_id != request.user.id:
            return Response({"detail": "Only the receiver can accept this call."}, status=status.HTTP_403_FORBIDDEN)
        if call.status != Call.Status.RINGING:
            return Response(self._serialize(call, request))
        answer = request.data.get("answer")
        if not isinstance(answer, dict):
            return Response({"detail": "A WebRTC answer is required."}, status=status.HTTP_400_BAD_REQUEST)
        call.answer = answer
        call.status = Call.Status.ACCEPTED
        call.accepted_at = timezone.now()
        call.ended_at = None
        call.save(update_fields=["answer", "status", "accepted_at", "ended_at", "updated_at"])
        return Response(self._serialize(call, request))

    @action(detail=True, methods=["post"])
    def signal(self, request, pk=None):
        call = self._member_call(request, pk)
        if call.status not in [Call.Status.RINGING, Call.Status.ACCEPTED]:
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
        if call.status != Call.Status.RINGING:
            return Response(self._serialize(call, request))
        call.status = Call.Status.CANCELLED
        call.ended_at = timezone.now()
        call.save(update_fields=["status", "ended_at", "updated_at"])
        return Response(self._serialize(call, request))

    @action(detail=True, methods=["post"])
    def end(self, request, pk=None):
        call = self._member_call(request, pk)
        if call.status in [Call.Status.RINGING, Call.Status.ACCEPTED]:
            call.ended_at = timezone.now()
            if call.status == Call.Status.RINGING:
                call.status = Call.Status.CANCELLED
            call.save(update_fields=["status", "ended_at", "updated_at"])
        return Response(self._serialize(call, request))
