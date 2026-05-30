/**
 * PdpMock — renders a credibly retailer-shaped product detail page from a
 * Fixture. Branches per retailer to give Myntra / AJIO / H&M their own
 * visual identity, matching the most recognizable cues of each real PDP:
 *
 *   - Myntra: green rating badge with star, MRP strikethrough + orange
 *     discount %, pink "ADD TO BAG" CTA, "SELECT SIZE | SIZE CHART >"
 *     header, circular size buttons.
 *   - AJIO: red square rating, BBS Price offer banner, color swatch dot,
 *     dark olive CTA, "Select Size (UNI)" label with a Check Size Chart
 *     link below.
 *   - H&M: minimal serif title, red H&M brand tag, members-club teaser
 *     bar, vertical stacked size buttons, black "Add to bag" CTA.
 *
 * The shared ImageGrid helper handles the photo gallery (2x2 grid for
 * multi-image fixtures, single hero for one, gradient placeholder when
 * imageUrls is absent). Generic fallback handles any future retailer
 * without a dedicated component.
 */
import type { Fixture } from "./fixtures";

interface Props {
  fixture: Fixture;
}

export function PdpMock({ fixture }: Props) {
  switch (fixture.retailerName) {
    case "Myntra":
      return <MyntraPdp fixture={fixture} />;
    case "AJIO":
      return <AjioPdp fixture={fixture} />;
    case "H&M":
      return <HmPdp fixture={fixture} />;
    default:
      return <GenericPdp fixture={fixture} />;
  }
}

// === Shared helpers =====================================================

function ImageGrid({ fixture }: Props) {
  const { imageUrls, pdpImageGradient, productImageLabel, product } = fixture;
  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div
        className="pdp-mock-image"
        style={{
          background: `linear-gradient(135deg, ${pdpImageGradient[0]} 0%, ${pdpImageGradient[1]} 100%)`,
        }}
      >
        <span>{productImageLabel}</span>
      </div>
    );
  }
  const className =
    imageUrls.length === 1 ? "pdp-mock-gallery single" : "pdp-mock-gallery multi";
  return (
    <div className={className}>
      {imageUrls.slice(0, 4).map((url, i) => (
        <img
          key={i}
          src={url}
          alt={`${product.title} view ${i + 1}`}
          className="pdp-mock-photo"
          loading="lazy"
        />
      ))}
    </div>
  );
}

function categoryLabel(product: Fixture["product"]): string {
  if (product.category === "dress") return "Dresses";
  if (product.category === "top") return "Tops";
  return "Bottomwear";
}

function priceToNumber(price: string): number {
  const n = parseInt(price.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 1000;
}

// === Myntra =============================================================

function MyntraPdp({ fixture }: Props) {
  const { product, price } = fixture;
  const sale = priceToNumber(price);
  const mrp = Math.round(sale * 2);
  const discount = Math.round((1 - sale / mrp) * 100);
  const genderLabel = product.gender === "female" ? "Women" : "Men";
  return (
    <div className="myntra-pdp">
      <div className="myntra-breadcrumb">
        Home / Clothing / {genderLabel} Clothing / {categoryLabel(product)} /{" "}
        <strong>{product.brand}</strong>
      </div>
      <div className="myntra-grid">
        <div className="myntra-images">
          <ImageGrid fixture={fixture} />
        </div>
        <div className="myntra-info">
          <h1 className="myntra-brand">{product.brand}</h1>
          <p className="myntra-title">{product.title}</p>
          <div className="myntra-rating">
            <span className="myntra-rating-badge">
              4.3 <span className="myntra-star">★</span>
            </span>
            <span className="myntra-rating-sep">|</span>
            <span className="myntra-rating-count">132 Ratings</span>
          </div>
          <div className="myntra-price-row">
            <span className="myntra-price">{price}</span>
            <span className="myntra-mrp">MRP ₹{mrp.toLocaleString("en-IN")}</span>
            <span className="myntra-discount">({discount}% OFF)</span>
          </div>
          <div className="myntra-tax">inclusive of all taxes</div>
          <div className="myntra-size-block">
            <div className="myntra-size-header">
              <span className="myntra-size-label">SELECT SIZE</span>
              <span className="myntra-size-chart-link">SIZE CHART ›</span>
            </div>
            <div className="myntra-sizes">
              {product.sizes.map((s) => (
                <button key={s} className="myntra-size" type="button">
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="myntra-actions">
            <button className="myntra-bag" type="button">
              ADD TO BAG
            </button>
            <button className="myntra-wish" type="button">
              ♡ WISHLIST
            </button>
          </div>
          <div className="myntra-promise">
            <strong>100% Original Products</strong>
            <br />
            Pay on delivery available
            <br />
            Easy 7 days returns and exchanges
          </div>
        </div>
      </div>
    </div>
  );
}

// === AJIO ==============================================================

function AjioPdp({ fixture }: Props) {
  const { product, price } = fixture;
  const sale = priceToNumber(price);
  const mrp = Math.round(sale * 1.7);
  const discount = Math.round((1 - sale / mrp) * 100);
  const bbsPrice = Math.round(sale * 0.78);
  return (
    <div className="ajio-pdp">
      <div className="ajio-grid">
        <div className="ajio-images">
          <ImageGrid fixture={fixture} />
        </div>
        <div className="ajio-info">
          <h1 className="ajio-brand">{product.brand}</h1>
          <p className="ajio-title">{product.title}</p>
          <div className="ajio-rating">
            <span className="ajio-rating-square">2 ★</span>
            <span className="ajio-rating-count">147 Ratings</span>
          </div>
          <div className="ajio-price-row">
            <span className="ajio-price">₹{sale.toLocaleString("en-IN")}</span>
            <span className="ajio-mrp">MRP ₹{mrp.toLocaleString("en-IN")}</span>
            <span className="ajio-discount">({discount}% OFF)</span>
          </div>
          <div className="ajio-tax">Price inclusive of all taxes</div>
          <div className="ajio-offer">
            <span className="ajio-offer-label">Offer ›</span>
            <div className="ajio-offer-body">
              <strong>BBS Price ₹{bbsPrice.toLocaleString("en-IN")}</strong>
              <div className="ajio-offer-sub">
                Shop for ₹1499 &amp; Get ₹399 off — extra Rs 100 off on app
              </div>
            </div>
          </div>
          <div className="ajio-color-row">
            <span className="ajio-color-label">Color</span>
            <div className="ajio-color-swatch" />
          </div>
          <div className="ajio-size-label">Select Size (UNI)</div>
          <div className="ajio-sizes">
            {product.sizes.map((s) => (
              <button key={s} className="ajio-size" type="button">
                {s}
              </button>
            ))}
          </div>
          <button className="ajio-size-chart-link" type="button">
            ⊞ Check Size Chart
          </button>
          <button className="ajio-cta-bag" type="button">
            🛍 ADD TO BAG
          </button>
          <button className="ajio-cta-wish" type="button">
            ♡ SAVE TO WISHLIST
          </button>
        </div>
      </div>
    </div>
  );
}

// === H&M ==============================================================

function HmPdp({ fixture }: Props) {
  const { product, price } = fixture;
  return (
    <div className="hm-pdp">
      <div className="hm-grid">
        <div className="hm-images">
          <ImageGrid fixture={fixture} />
        </div>
        <div className="hm-info">
          <div className="hm-brand">H&amp;M</div>
          <h1 className="hm-title">{product.title}</h1>
          <div className="hm-price">{price}</div>
          <div className="hm-members">
            <span className="hm-members-dot" />
            Members get 25% off — <a href="#">join now</a>
          </div>
          <div className="hm-color">
            Color: <strong>Black</strong>
          </div>
          <div className="hm-size-block">
            <div className="hm-size-header">
              <span>Select size</span>
              <a href="#" className="hm-size-find">
                Find your size
              </a>
            </div>
            <div className="hm-sizes">
              {product.sizes.map((s) => (
                <button key={s} className="hm-size" type="button">
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button className="hm-cta-bag" type="button">
            Add to bag
          </button>
          <button className="hm-cta-fav" type="button">
            ♡ Add to favourites
          </button>
        </div>
      </div>
    </div>
  );
}

// === Generic fallback ================================================

function GenericPdp({ fixture }: Props) {
  const { product, price, retailerName, retailerAccent } = fixture;
  return (
    <div className="pdp-mock">
      <div className="pdp-mock-retailer" style={{ color: retailerAccent }}>
        {retailerName}
      </div>
      <ImageGrid fixture={fixture} />
      <div className="pdp-mock-brand">{product.brand}</div>
      <h2 className="pdp-mock-title">{product.title}</h2>
      <div className="pdp-mock-price">{price}</div>
      <div className="pdp-mock-section-label">Select size</div>
      <div className="pdp-mock-sizes">
        {product.sizes.map((s) => (
          <button key={s} className="pdp-mock-size" type="button">
            {s}
          </button>
        ))}
      </div>
      <button
        className="pdp-mock-cta"
        type="button"
        style={{ background: retailerAccent }}
      >
        Add to bag
      </button>
    </div>
  );
}
