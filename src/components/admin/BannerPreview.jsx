/** Preview fiel do banner como aparece no site. */
export default function BannerPreview({ banner }) {
  const pos = banner.content_position === 'left'
    ? 'items-start text-left'
    : banner.content_position === 'right'
      ? 'items-end text-right'
      : 'items-center text-center';
  const img = banner.desktop_image_url || banner.image_url;

  return (
    <div className="relative h-72 overflow-hidden sm:h-80">
      {img ? (
        <img src={img} alt={banner.title ?? 'Banner'} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-[#2a1235] via-[#160a1f] to-black" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0308] via-black/40 to-transparent" />
      <div className={`absolute inset-0 flex flex-col justify-center px-8 ${pos}`}>
        {banner.title && <h2 className="font-serif text-4xl text-gradient">{banner.title}</h2>}
        {banner.subtitle && <p className="mt-2 max-w-md text-plum-200">{banner.subtitle}</p>}
        {banner.button_text && (
          <span className="mt-5 w-fit rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-plum-600/40">
            {banner.button_text}
          </span>
        )}
      </div>
    </div>
  );
}
