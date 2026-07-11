from firebase_functions import https_fn
from a2wsgi import ASGIMiddleware
from server import app

# Convert FastAPI (ASGI) application to WSGI format required by Firebase Functions (Flask)
wsgi_app = ASGIMiddleware(app)

@https_fn.on_request()
def api(req: https_fn.Request) -> https_fn.Response:
    return https_fn.serve_wsgi(req, wsgi_app)
