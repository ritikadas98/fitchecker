# Screenshots

Files referenced from the project root README. Filenames are exact — save your captures with these names so the README image tags resolve.

## What to capture

All seven screenshots come from the **real extension running on real retailer PDPs** (or, for the order proof, an actual order-history page). Side panel cropped tightly so the focus stays on the verdict UI; file size stays small.

Recommended capture flow:
1. Set your profile to a body that produces the verdict state you want.
2. Open the corresponding retailer PDP in Chrome.
3. Open the FitCheck side panel.
4. Wait for the silhouette to fully render (the tint pass takes ~150ms).
5. Crop the screenshot tightly to the side panel — exclude the rest of the page chrome (except for the hero, which keeps a slice of the page visible for context).
6. Save as PNG, ~400-500px wide at 2x density (so ~800-1000px wide raw).

## Required files

| Filename | What it shows | Suggested source |
|---|---|---|
| `hero.png` | Hero shot at the top of the README. Side panel + a slice of the retailer page visible to the left. Cleanest Perfect Fit verdict. | H&M Straight High Jeans `productpage.1209534017.html` with a profile that produces a size-12 Perfect Fit. |
| `state-recommended.png` | Side panel close-up: green "Recommended for you" with all-green pins and green-tinted silhouette. | AJIO Levi's Women Straight Fit High Rise Jeans, profile waist around 30 inches → produces size 28 Perfect Fit. |
| `state-may-work.png` | Side panel close-up: amber "May work for you" verdict with amber-tinted silhouette. | AJIO Revangi Anarkali (a "Slightly short" length verdict is a clean example of this state). |
| `state-not-recommended.png` | Side panel close-up: red "Not recommended" verdict with red-tinted silhouette. | Myntra Inddus Floral Embroidered Maxi at the wrong size (e.g. size M for a body sized closer to XL). |
| `state-validated-match.png` | Side panel showing the green "Matches your previous order" callout above the verdict, on a Myntra order-history URL. | Myntra Youthnic Ajrak Print Peplum Kurti — open via the order-history URL with `size=M` in the query so the callout activates. |
| `state-validated-differ.png` | Side panel showing the amber "You previously bought X · Math now recommends Y" callout. | Myntra House of Pataudi Geometric Printed Sequinned Jashn Kurta — opened via order-history URL so the past purchase appears. |
| `real-world-order.png` | The AJIO order-history page showing a Levi's jeans order that was originally placed at size 30 and then marked as "Exchange Order" at size 28. Proof image for the real-world validation anecdote in the README. | AJIO Account → Past Orders → the Levi's exchange entry. Crop to show the product image, name, original/exchanged size, and the "Delivered" + "Exchange Order" badges. |

## Once saved

After dropping the PNGs into this folder, commit and push. The README image tags will resolve and the screenshots will render on the GitHub page.
