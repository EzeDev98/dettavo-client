import './FieldLabel.css';

// The line above a field or a command (prototype .lbl). With htmlFor it is the field's <label>; without, a paragraph.
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
