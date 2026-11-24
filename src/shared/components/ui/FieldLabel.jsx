import './FieldLabel.css';

export default function FieldLabel({ htmlFor, children }) {
  if (htmlFor) {
    return (
      <label className="ui-field-label" htmlFor={htmlFor}>
        {children}
      </label>
    );
  }
  return <p className="ui-field-label">{children}</p>;
}
