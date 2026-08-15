import logging
import time


logger = logging.getLogger("marketplace.request")


class RequestLoggingMiddleware:
    """Log every request in a compact, development-friendly format.

    The middleware intentionally does not log authorization headers, request
    bodies, passwords, tokens, or other potentially sensitive payloads.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started = time.perf_counter()
        user_label = "anonymous"
        try:
            if getattr(request, "user", None) is not None and request.user.is_authenticated:
                user_label = f"user={request.user.pk}"

            response = self.get_response(request)
            duration_ms = (time.perf_counter() - started) * 1000
            logger.info(
                "REQUEST %s %s -> %s (%.0fms, %s)",
                request.method,
                request.get_full_path(),
                response.status_code,
                duration_ms,
                user_label,
            )
            return response
        except Exception:
            duration_ms = (time.perf_counter() - started) * 1000
            logger.exception(
                "%s %s -> EXCEPTION (%.0fms, %s)",
                request.method,
                request.get_full_path(),
                duration_ms,
                user_label,
            )
            raise
