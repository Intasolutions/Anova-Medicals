import sys

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if '/auth/token/' in request.path:
            # Path and method only. The body is never printed: for a login it
            # holds the password, for /auth/token/refresh/ a refresh token, and
            # whatever is printed here ends up in the server logs.
            msg = f"\n!!! INCOMING LOGIN REQUEST !!!\nPath: {request.path}\nMethod: {request.method}\n"
            msg += "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            
            # FORCE PRINT TO CONSOLE
            sys.stdout.write(msg)
            sys.stdout.flush()
            sys.stderr.write(msg)
            sys.stderr.flush()
        
        return self.get_response(request)
