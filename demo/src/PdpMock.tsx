/**
 * Generic mock product detail page. Renders a credibly e-commerce-shaped
 * layout from a Fixture — used as the left-side content of the fake Chrome
 * window. Replaces the need for real screenshots while still selling the
 * "side panel sits next to a real PDP" framing.
 */
import type { Fixture } from "./fixtures";

interface Props {
  fixture: Fixture;
}

export function PdpMock({ fixture }: Props) {
  const { product, retailerName, retailerAccent, pdpImageGradient, price, productImageLabel } = fixture;
  const imageStyle = {
    background: `linear-gradient(135deg, ${pdpImageGradient[0]} 0%, ${pdpImageGradient[1]} 100%)`,
  };
  return (
    <div className="pdp-mock">
      <div className="pdp-mock-retailer" style={{ color: retailerAccent }}>
        {retailerName}
      </div>
      <div className="pdp-mock-image" style={imageStyle}>
        <span>{productImageLabel}</span>
      </div>
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
      <p className="pdp-mock-note">
        This is a mock product page. The FitCheck side panel on the right runs the real
        verdict math against this product's actual size chart.
      </p>
    </div>
  );
}
