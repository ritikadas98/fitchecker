# Screenshots

Files referenced from the project root README. Filenames are exact — save your captures with these names so the README image tags resolve.

## What to capture

All four screenshots are captures of the **real extension running on real retailer PDPs**. Side panel only (cropped tightly to the FitCheck side panel column) so the file size stays small and the focus stays on the verdict UI.

Recommended capture flow:
1. Set your profile to a body that produces the verdict state you want.
2. Open the corresponding retailer PDP in Chrome.
3. Open the FitCheck side panel.
4. Wait for the silhouette to fully render (the tint pass takes ~150ms).
5. Crop the screenshot tightly to the side panel — exclude the rest of the page chrome.
6. Save as PNG, ~400-500px wide at 2x density (so ~800-1000px wide raw).

## Required files

| Filename | What it shows | Suggested source |
|---|---|---|
| `hero.png` | The hero shot at the top of the README. Side panel on a real H&M / Myntra / AJIO PDP, full-context (side panel + a slice of the PDP visible to the left). Recommend the H&M Straight High Jeans size-12 "Perfect fit" view since it's the cleanest verdict state. | H&M India `productpage.1209534017.html` with profile (5'4", waist 28-29, hip 38-39). |
| `state-recommended.png` | Side panel close-up showing a green "Recommended for you" verdict with all-green pins and a green-tinted silhouette. | Same H&M jeans, or the Myntra Inddus maxi at the right size. |
| `state-may-work.png` | Side panel close-up showing an amber "May work for you" verdict — at least one axis flagged but the size is still wearable. The Ritu Kumar Anarkali at size M ("Slightly short" length) is a perfect example. | AJIO Ritu Kumar Anarkali, profile that produces an amber length verdict. |
| `state-not-recommended.png` | Side panel close-up showing a red "Not recommended" verdict with the silhouette tinted red. | Myntra Inddus Floral Maxi at the wrong size (e.g. size M for a body sized closer to XL) — produces the "Looser than intended" red state. |

## Once saved

After dropping the PNGs into this folder, commit and push. The README image tags will resolve and the screenshots will render on the GitHub page.
