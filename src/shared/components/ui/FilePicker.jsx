// The browser's file picker, with no visible element of its own. A button elsewhere opens it through ref:
// <FilePicker ref={pickerRef} onFiles={add} /> ... pickerRef.current.click().
export default function FilePicker({ ref, onFiles, accept = 'video/*,audio/*', multiple = true }) {
  const handleChange = (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length) onFiles(files);
  };

  return <input ref={ref} type="file" accept={accept} multiple={multiple} hidden onChange={handleChange} />;
}
