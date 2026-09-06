# Script d'aide pour exporter vers GitHub
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  🚀 Exportation de CNED Sven vers GitHub" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier la configuration user.name et user.email
$gitUser = git config --global user.name
$gitEmail = git config --global user.email

if (-not $gitUser) {
    $name = Read-Host "Entrez votre nom ou pseudo GitHub"
    git config --global user.name $name
}
if (-not $gitEmail) {
    $email = Read-Host "Entrez l'adresse email de votre compte GitHub"
    git config --global user.email $email
}

# Vérifier s'il y a un commit
$status = git status --porcelain
if ($status) {
    git add .
    git commit -m "Application CNED Sven complète"
    Write-Host "✅ Fichiers validés dans Git." -ForegroundColor Green
}

# Demander l'URL GitHub
$remoteUrl = Read-Host "Collez l'URL de votre dépôt GitHub (ex: https://github.com/pseudo/cned-suivi-sven.git)"
if ($remoteUrl) {
    git remote remove origin 2>$null
    git remote add origin $remoteUrl
    git branch -M main
    Write-Host "Envoi vers GitHub en cours..." -ForegroundColor Cyan
    git push -u origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 Projet exporté sur GitHub avec succès !" -ForegroundColor Green
    }
}
