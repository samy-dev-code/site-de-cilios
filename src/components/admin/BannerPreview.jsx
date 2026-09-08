/** Preview fiel do banner hero full-width como aparece no site. */
const HEIGHTS = {
  compact: 'h-[60vw] max-h-[380px] min-h-[240px]',
  default: 'h-[75vw] max-h-[520px] min-h-[280px]',
  tall: 'h-[88vw] max-h-[640px] min-h-[320px]',
  fullscreen: 'h-[92vw] max-h-[720px] min-h-[360px]',
};
const FITS = ['cover', 'contain'];
const POS = {
  center: 'object-center', top: 'object-top', bottom: 'object-bottom',
  left: 'object-left', right: 'object-right',
  'top left': 'object-top-left', 'top right': 'object-top-right',
  'bottom left': 'object-bottom-left', 'bottom right': 'object-bottom-right',
};
const CONTENT_POS = {
  center: 'items-center justify-center text-center px-8',
  left: 'items-center justify-start text-left px-8 sm:px-14',
  right: 'items-center justify-end text-right px-8 sm:px-14',
  'bottom-left': 'items-end justify-start text-left px-8 pb-14',
  'bottom-center': 'items-end justify-center text-center px-8 pb-14',
  'bottom-right': 'items-end justify-end text-right px-8 pb-14',
};
const TITLE_SIZES = {
  normal: 'text-3xl sm:text-5xl', large: 'text-4xl sm:text-6xl', huge: 'text-5xl sm:text-7xl',
};

export default function BannerPreview({ banner, viewport = 'desktop' }) {
  const img = viewport === 'mobile' && banner.mobile_image_url ? banner.mobile_image_url : (banner.desktop_image_url || banner.image_url);
  const fit = FITS.includes(banner.object_fit) ? banner.object_fit : 'cover';
  const cpos = CONTENT_POS[banner.content_position] || CONTENT_POS.center;
  const overlay = Math.min(85, Math.max(0, Number(banner.overlay_opacity ?? 55))) / 100;

  return (
    <div className={`relative w-full overflow-hidden bg-black ${HEIGHTS[banner.height_mode] || HEIGHTS.default}`}>
      {img ? (
        <img
          src={img}
          alt={banner.title ?? 'Banner'}
          className={`h-full w-full ${fit === 'contain' ? 'object-contain bg-[#0a0510]' : 'object-cover'} ${POS[banner.object_position] || 'object-center'}`}
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-[#2a1235] via-[#160a1f] to-black" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#08030d] via-[#08030d]/50 to-transparent" style={{ opacity: overlay }} />
      <div className={`absolute inset-0 flex flex-col ${cpos}`}>
        <div className="max-w-xl">
          {banner.featured && (
            <span className="mb-3 inline-block rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-[9px] uppercase tracking-[0.3em] text-amber-200">✦ Destaque</span>
          )}
          {banner.title && (
            <h2 className={`font-serif text-gradient leading-tight drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)] ${TITLE_SIZES[banner.title_size] || TITLE_SIZES.normal}`}>
              {banner.title}
            </h2>
          )}
          {banner.subtitle && <p className="mt-3 text-sm text-white/85 sm:text-base">{banner.subtitle}</p>}
          {banner.button_text && (
            <span className="mt-5 inline-block rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-7 py-3 text-sm font-medium text-white shadow-lg shadow-plum-600/40">
              {banner.button_text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
