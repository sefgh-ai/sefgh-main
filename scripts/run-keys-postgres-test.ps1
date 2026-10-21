$ErrorActionPreference = 'Stop'
$containerName = 'sefgh-keys-pg-' + [Guid]::NewGuid().ToString('N').Substring(0, 12)
$image = 'postgres@sha256:00bc86618629af00d2937fdc5a5d63db3ff8450acf52f0636ec813c7f4902929'
$created = $false
try {
  docker run --rm --detach --name $containerName --label com.sefgh.test=keys --network none --memory 512m --cpus 2 --env POSTGRES_PASSWORD=fixture-only-local-password $image | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not create isolated PostgreSQL fixture' }
  $created = $true
  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    docker exec $containerName pg_isready -h 127.0.0.1 -U postgres 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Milliseconds 250
  }
  if (-not $ready) { throw 'PostgreSQL fixture did not start' }
  node scripts/keys-postgres-test.mjs $containerName
  if ($LASTEXITCODE -ne 0) { throw 'Native PostgreSQL checks failed' }
} finally {
  if ($created) {
    $labelsText = docker inspect --format '{{json .Config.Labels}}' $containerName
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect fixture ownership before stopping it' }
    $labels = $labelsText | ConvertFrom-Json
    if ($labels.'com.sefgh.test' -ne 'keys') { throw 'Refusing to stop unowned container' }
    docker stop --time 1 $containerName | Out-Null
  }
}
