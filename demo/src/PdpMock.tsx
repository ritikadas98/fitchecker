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

/**
 * Near-clone of the real Myntra PDP. Renders the full site chrome
 * (M logo, top nav, search, profile/wishlist/bag icons), breadcrumb
 * trail, brand + title block, rating badge, MRP strikethrough with
 * orange discount %, MORE COLORS thumbnails, pill-shaped size buttons
 * with per-size price + low-stock badges, dual ADD TO BAG / WISHLIST
 * CTAs with bag+heart SVG icons, DELIVERY OPTIONS pincode input, and
 * the 3-line promise footer.
 */
function MyntraPdp({ fixture }: Props) {
  const { product, price } = fixture;
  const sale = priceToNumber(price);
  const mrp = Math.round(sale * 2);
  const discount = Math.round((1 - sale / mrp) * 100);
  const genderLabel = product.gender === "female" ? "Women" : "Men";
  const categoryCrumb =
    product.category === "dress"
      ? "Ethnic Dresses"
      : product.category === "top"
      ? `${genderLabel} Tops`
      : `${genderLabel} Bottomwear`;
  return (
    <div className="myntra-pdp">
      {/* Site header — logo, nav, search, account icons */}
      <header className="myntra-header">
        <div className="myntra-logo">
          <img
            src={`${import.meta.env.BASE_URL}myntra-logo.png`}
            alt="Myntra"
            className="myntra-logo-img"
          />
        </div>
        <nav className="myntra-nav">
          <a className="myntra-nav-item">MEN</a>
          <a className="myntra-nav-item">WOMEN</a>
          <a className="myntra-nav-item">KIDS</a>
          <a className="myntra-nav-item">HOME</a>
          <a className="myntra-nav-item">BEAUTY</a>
          <a className="myntra-nav-item">GENZ</a>
          <a className="myntra-nav-item">
            STUDIO <span className="myntra-nav-new">NEW</span>
          </a>
        </nav>
        <div className="myntra-search">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94969f"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="myntra-search-placeholder">
            Search for products, brands and more
          </span>
        </div>
        <div className="myntra-header-icons">
          <div className="myntra-header-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#282c3f"
              strokeWidth="1.6"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 22 C 4 16, 20 16, 20 22" />
            </svg>
            <span>Profile</span>
          </div>
          <div className="myntra-header-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#282c3f"
              strokeWidth="1.6"
            >
              <path d="M12 21 C 4 14, 4 8, 8 6 C 11 5, 12 7, 12 8 C 12 7, 13 5, 16 6 C 20 8, 20 14, 12 21 Z" />
            </svg>
            <span>Wishlist</span>
          </div>
          <div className="myntra-header-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#282c3f"
              strokeWidth="1.6"
            >
              <path d="M6 8 L 6 20 L 18 20 L 18 8 Z" />
              <path d="M9 8 C 9 5, 15 5, 15 8" />
            </svg>
            <span>Bag</span>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="myntra-breadcrumb">
        Home / Clothing / {genderLabel} Clothing / {categoryCrumb} /{" "}
        <strong>
          {product.brand} {categoryCrumb}
        </strong>
        <span className="myntra-breadcrumb-sep"> &gt; </span>
        <strong>More By {product.brand}</strong>
      </div>

      {/* Two-column product layout */}
      <div className="myntra-grid">
        <div className="myntra-images">
          <ImageGrid fixture={fixture} />
        </div>

        <div className="myntra-info">
          <h1 className="myntra-brand">{product.brand}</h1>
          <p className="myntra-title">{product.title}</p>

          <div className="myntra-rating">
            <span className="myntra-rating-badge">
              4.1 <span className="myntra-star">★</span>
            </span>
            <span className="myntra-rating-sep">|</span>
            <span className="myntra-rating-count">597 Ratings</span>
          </div>

          <hr className="myntra-divider" />

          <div className="myntra-price-row">
            <span className="myntra-price">{price}</span>
            <span className="myntra-mrp">
              MRP ₹{mrp.toLocaleString("en-IN")}
            </span>
            <span className="myntra-discount">({discount}% OFF)</span>
          </div>
          <div className="myntra-tax">inclusive of all taxes</div>

          <hr className="myntra-divider" />

          {/* Size selector */}
          <div className="myntra-size-block">
            <div className="myntra-size-header">
              <span className="myntra-size-label">SELECT SIZE</span>
              <span className="myntra-size-chart-link">SIZE CHART ›</span>
            </div>
            <div className="myntra-sizes">
              {product.sizes.map((s, i) => {
                const isLowStock =
                  i === product.sizes.length - 2 ||
                  i === product.sizes.length - 1;
                const stockLabel =
                  i === product.sizes.length - 2 ? "3 left" : "1 left";
                return (
                  <button key={s} className="myntra-size-pill" type="button">
                    <span className="myntra-size-letter">{s}</span>
                    <span className="myntra-size-price">
                      Rs. {sale.toLocaleString("en-IN")}
                    </span>
                    {isLowStock && (
                      <span className="myntra-size-stock">{stockLabel}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CTA row */}
          <div className="myntra-actions">
            <button className="myntra-bag" type="button">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
              >
                <path d="M6 8 L 6 20 L 18 20 L 18 8 Z" />
                <path d="M9 8 C 9 5, 15 5, 15 8" />
              </svg>
              ADD TO BAG
            </button>
            <button className="myntra-wish" type="button">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#282c3f"
                strokeWidth="2"
              >
                <path d="M12 21 C 4 14, 4 8, 8 6 C 11 5, 12 7, 12 8 C 12 7, 13 5, 16 6 C 20 8, 20 14, 12 21 Z" />
              </svg>
              WISHLIST
            </button>
          </div>

          <hr className="myntra-divider" />

          {/* Delivery options */}
          <div className="myntra-delivery">
            <div className="myntra-delivery-label">
              DELIVERY OPTIONS{" "}
              <svg
                width="18"
                height="14"
                viewBox="0 0 24 18"
                fill="none"
                stroke="#282c3f"
                strokeWidth="1.5"
              >
                <rect x="1" y="3" width="14" height="11" />
                <path d="M15 7 L 19 7 L 22 11 L 22 14 L 15 14 Z" />
                <circle cx="6" cy="14" r="2" />
                <circle cx="18" cy="14" r="2" />
              </svg>
            </div>
            <div className="myntra-pincode-row">
              <input
                className="myntra-pincode"
                placeholder="Enter pincode"
                disabled
              />
              <button className="myntra-pincode-check" type="button">
                Check
              </button>
            </div>
            <div className="myntra-delivery-sub">
              Please enter PIN code to check delivery time &amp; Pay on Delivery Availability
            </div>
          </div>

          <hr className="myntra-divider" />

          <div className="myntra-promise">
            <div className="myntra-promise-item">100% Original Products</div>
            <div className="myntra-promise-item">Pay on delivery might be available</div>
            <div className="myntra-promise-item">Easy 7 days returns and exchanges</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// === AJIO ==============================================================

/**
 * Near-clone of the real AJIO PDP. Stacks the dual header (utility links
 * + AJIOLUXE button row on top, logo + nav + search + dark-circle account
 * icons below), breadcrumb, then the two-column product layout with
 * olive/gold accent throughout: brand caps in olive, green rating
 * square, MRP + olive discount %, dashed-border Offer box with code +
 * BBS Price callout, color name + swatch, "Select Size (UNI)" with
 * horizontal-arrow size scroller, Check Size Chart link, beige delivery
 * banner, dark-olive ADD TO BAG, "HANDPICKED STYLES | ASSURED QUALITY"
 * tagline, and outline SAVE TO WISHLIST.
 */
function AjioPdp({ fixture }: Props) {
  const { product, price } = fixture;
  const sale = priceToNumber(price);
  const mrp = Math.round(sale * 3.3);
  const discount = Math.round((1 - sale / mrp) * 100);
  const bbsPrice = Math.round(sale * 0.75);
  const genderLabel = product.gender === "female" ? "Women" : "Men";
  const categoryCrumb =
    product.category === "dress"
      ? "Dresses"
      : product.category === "top"
      ? "Kurtas"
      : "Bottomwear";
  return (
    <div className="ajio-pdp">
      {/* Top utility bar */}
      <div className="ajio-utility-bar">
        <span className="ajio-utility-link">Sign In / Join AJIO</span>
        <span className="ajio-utility-link">Customer Care</span>
        <button className="ajio-luxe-btn" type="button">
          Visit AJIOLUXE
        </button>
      </div>

      {/* Main header */}
      <header className="ajio-header">
        <div className="ajio-logo">AJIO</div>
        <nav className="ajio-nav">
          <a className="ajio-nav-item">MEN <span className="ajio-nav-caret">▾</span></a>
          <a className="ajio-nav-item">WOMEN <span className="ajio-nav-caret">▾</span></a>
          <a className="ajio-nav-item">KIDS <span className="ajio-nav-caret">▾</span></a>
          <a className="ajio-nav-item">BEAUTY <span className="ajio-nav-caret">▾</span></a>
          <a className="ajio-nav-item">HOME &amp; KITCHEN <span className="ajio-nav-caret">▾</span></a>
        </nav>
        <div className="ajio-search">
          <span className="ajio-search-placeholder">Search AJIO</span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#26283d"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div className="ajio-header-icons">
          <div className="ajio-icon-circle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M12 21 C 4 14, 4 8, 8 6 C 11 5, 12 7, 12 8 C 12 7, 13 5, 16 6 C 20 8, 20 14, 12 21 Z" />
            </svg>
          </div>
          <div className="ajio-icon-circle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M6 8 L 6 20 L 18 20 L 18 8 Z" />
              <path d="M9 8 C 9 5, 15 5, 15 8" />
            </svg>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="ajio-breadcrumb">
        Home / {genderLabel} / Ethnic Wear / {categoryCrumb} / {product.title}
      </div>

      {/* Product grid */}
      <div className="ajio-grid">
        <div className="ajio-images">
          <ImageGrid fixture={fixture} />
        </div>

        <div className="ajio-info">
          <h1 className="ajio-brand">{product.brand}</h1>
          <p className="ajio-title">{product.title}</p>

          <div className="ajio-rating">
            <span className="ajio-rating-square">3.5 ★</span>
            <span className="ajio-rating-count">6 Ratings</span>
          </div>

          <div className="ajio-price-row">
            <span className="ajio-price">{price}</span>
          </div>
          <div className="ajio-mrp-row">
            <span className="ajio-mrp">MRP ₹{mrp.toLocaleString("en-IN")}</span>
            <span className="ajio-discount">({discount}% OFF)</span>
          </div>
          <div className="ajio-tax">Price inclusive of all taxes</div>

          {/* Offer box */}
          <div className="ajio-offer">
            <div className="ajio-offer-left">
              <div className="ajio-offer-label">Offer ›</div>
              <div className="ajio-offer-code">
                Use Code
                <strong>NEW25</strong>
                <span className="ajio-tc">T&amp;C ↗</span>
              </div>
            </div>
            <div className="ajio-offer-right">
              <div className="ajio-bbs-row">
                <span className="ajio-bbs-pill">bbs</span>
                <strong>BBS Price ₹{bbsPrice.toLocaleString("en-IN")}</strong>
              </div>
              <div className="ajio-offer-desc">
                25% off for new users; Extra 5% off on app{" "}
                <a className="ajio-offer-link">View All Products ↗</a>
              </div>
            </div>
          </div>
          <div className="ajio-more-offers">+4 More</div>

          <hr className="ajio-divider" />

          {/* Color */}
          <div className="ajio-color-section">
            <div className="ajio-color-name">Yellow</div>
            <div
              className="ajio-color-swatch"
              style={{
                background: `linear-gradient(135deg, ${fixture.pdpImageGradient[0]} 0%, ${fixture.pdpImageGradient[1]} 100%)`,
              }}
            />
          </div>

          {/* Size selector */}
          <div className="ajio-size-section">
            <div className="ajio-size-label">
              Select Size <span className="ajio-size-uni">(UNI)</span>
            </div>
            <div className="ajio-sizes-row">
              <button className="ajio-size-arrow" type="button" aria-label="scroll left">
                ‹
              </button>
              <div className="ajio-sizes">
                {product.sizes.map((s) => (
                  <button key={s} className="ajio-size" type="button">
                    {s}
                  </button>
                ))}
              </div>
              <button className="ajio-size-arrow" type="button" aria-label="scroll right">
                ›
              </button>
            </div>
            <button className="ajio-size-chart-link" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
              Check Size Chart
            </button>
          </div>

          {/* Delivery banner */}
          <div className="ajio-delivery-banner">
            <svg
              width="16"
              height="20"
              viewBox="0 0 24 28"
              fill="none"
              stroke="#26283d"
              strokeWidth="2"
            >
              <path d="M12 26 C 4 18, 4 10, 12 2 C 20 10, 20 18, 12 26 Z" />
              <circle cx="12" cy="11" r="3" />
            </svg>
            Select your size to know your estimated delivery date.
          </div>

          {/* CTAs */}
          <button className="ajio-cta-bag" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M6 8 L 6 20 L 18 20 L 18 8 Z" />
              <path d="M9 8 C 9 5, 15 5, 15 8" />
            </svg>
            ADD TO BAG
          </button>
          <div className="ajio-cta-tagline">HANDPICKED STYLES | ASSURED QUALITY</div>
          <button className="ajio-cta-wish" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21 C 4 14, 4 8, 8 6 C 11 5, 12 7, 12 8 C 12 7, 13 5, 16 6 C 20 8, 20 14, 12 21 Z" />
            </svg>
            SAVE TO WISHLIST
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
