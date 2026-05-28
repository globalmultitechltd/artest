# Static file server - run: .\serve.ps1
$port = 3000
$root = $PSScriptRoot
$mime = @{ '.html' = 'text/html'; '.js' = 'application/javascript'; '.jpg' = 'image/jpeg'; '.png' = 'image/png'; '.mp3' = 'audio/mpeg' }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving at http://localhost:$port"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = $ctx.Request.Url.LocalPath
  if ($path -eq '/') { $path = '/index.html' }
  $file = Join-Path $root ($path.TrimStart('/') -replace '/', [IO.Path]::DirectorySeparatorChar)
  if (!(Test-Path $file) -or ([IO.File]::GetAttributes($file) -band [IO.FileAttributes]::Directory)) {
    $ctx.Response.StatusCode = 404
    $ctx.Response.Close()
    continue
  }
  $ext = [IO.Path]::GetExtension($file)
  $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
  $ctx.Response.OutputStream.Write([IO.File]::ReadAllBytes($file), 0, (Get-Item $file).Length)
  $ctx.Response.Close()
}
