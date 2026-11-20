# Rollback — hardening visual do player YouTube

Estado anterior preservado na tag **`pre-youtube-hardening`** (commit `a819be2`).

## Voltar tudo (reverter o hardening inteiro)

```powershell
git revert --no-commit <commit-do-hardening>
git commit -m "revert: hardening visual do player YouTube"
git push
```

Ou, se o hardening ainda não foi commitado:

```powershell
git checkout pre-youtube-hardening -- src/components/YouTubePlayer.tsx
```

## Voltar só um arquivo

```powershell
git checkout pre-youtube-hardening -- src/components/YouTubePlayer.tsx
```

## Conferir o que mudou

```powershell
git diff pre-youtube-hardening -- src/components/YouTubePlayer.tsx
```

## Reaplicar depois (se o rollback for temporário)

```powershell
git checkout <commit-do-hardening> -- src/components/YouTubePlayer.tsx
```

## Escopo

Só `src/components/YouTubePlayer.tsx`. Nenhuma migration, nenhuma edge function,
nenhum outro componente. O `UniversalVideoPlayer` (Vimeo/Panda/Bunny/VTurb/Drive)
não é afetado — ele não passa por esse arquivo.

---

## Ajuste fino sem rollback

O crop (overscan) é o único ponto subjetivo: ~8% da largura e ~5% da base do
vídeo viram moldura morta. Se ficar agressivo demais, mexa só nestes 4 números
no `style` do `<iframe>` do `YouTubePlayer.tsx`:

| Nível | `top` | `left` | `width` | `height` | Efeito |
|---|---|---|---|---|---|
| Agressivo (Getfy) | `-10%` | `-4%` | `108%` | `124%` | esconde logo, título em pausa, end screen |
| Médio | `-8%` | `-2%` | `104%` | `116%` | esconde flash e logo; título pode escapar |
| Nenhum | `0` | `0` | `100%` | `100%` | sem crop — só o véu e `controls:0` atuam |

Trocar de nível é edição de 4 valores, sem commit de rollback.
