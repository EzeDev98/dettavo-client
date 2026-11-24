export default function FilePicker({ ref, onFiles, accept = 'video/*,audio/*', multiple = true }) {
  const handleChange = (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length) onFiles(files);
  };

  return <input ref={ref} type="file" accept={accept} multiple={multiple} hidden onChange={handleChange} />;
}
