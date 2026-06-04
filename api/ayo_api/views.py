_TIMEZONE_SCRIPT = (
    b'<script>'
    b'(function(){'
    b'var tz=Intl.DateTimeFormat().resolvedOptions().timeZone;'
    b'var orig=swaggerUiConfig.requestInterceptor;'
    b'swaggerUiConfig.requestInterceptor=function(r){'
    b'r.headers=r.headers||{};'
    b'r.headers["X-Timezone"]=tz;'
    b'return orig?orig(r):r;'
    b'};'
    b'})()'
    b'</script>'
)


def swagger_with_timezone(view):
    def wrapped(request, *args, **kwargs):
        response = view(request, *args, **kwargs)
        if hasattr(response, 'render'):
            response.render()
        response.content = response.content.replace(b'</body>', _TIMEZONE_SCRIPT + b'</body>')
        return response
    return wrapped
