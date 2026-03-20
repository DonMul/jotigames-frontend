export default function GameCardDisplay({ imageSrc, imageAlt, title, subtitle }) {
  return (
    <>
      {imageSrc ? <img className="hand-card-image" src={imageSrc} alt={imageAlt || title || ''} /> : null}
      <div className="hand-card-body">
        <h3 className="hand-card-title">{title}</h3>
        <p className="hand-card-type">{subtitle}</p>
      </div>
    </>
  )
}
