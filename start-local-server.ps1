# Serveur Web local ultra-léger pour CNED Sven
$port = 8080
$path = $PSScriptRoot
if (-not $path) { $path = Get-Location }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  🎓 Application CNED Sven démarrée sur :" -ForegroundColor Cyan
    Write-Host "  👉 http://localhost:$port" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "Appuyez sur Ctrl+C pour arrêter le serveur.`n"

    # Ouvrir automatiquement le navigateur par défaut
    Start-Process "http://localhost:$port"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $localPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($localPath) -or $localPath -eq '/') {
            $localPath = "index.html"
        }

        $filePath = Join-Path $path $localPath

        if (Test-Path $filePath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            
            # Types MIME
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".svg"  { "image/svg+xml" }
                default { "application/octet-stream" }
            }

            $response.ContentType = $mime
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
