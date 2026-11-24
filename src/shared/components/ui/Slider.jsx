import './Slider.css';

export default function Slider({ label, min = 0, max = 100, step = 1, value, disabled = false, onChange }) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range"
      className="ui-slider"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      style={{ '--slider-fill': `${fill}%` }}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
