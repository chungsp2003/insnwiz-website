const form = document.querySelector('#drive-upload');
const status = document.querySelector('#upload-status');
const button = form.querySelector('button');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const file = form.elements.file.files[0];
  if (!file || !file.size || file.size > 20 * 1024 * 1024) {
    status.textContent = 'Choose a non-empty file up to 20 MB.';
    return;
  }
  button.disabled = true;
  status.textContent = `Uploading ${file.name}… Please keep this page open.`;
  try {
    const response = await fetch('/api/upload', {
      method: 'POST', headers: {
        'X-Upload-Email': form.elements.email.value.trim(),
        'X-Upload-Password': form.elements.password.value,
        'X-File-Name': encodeURIComponent(file.name),
        'Content-Type': 'application/octet-stream',
      }, body: file,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Upload failed. Please contact the site owner.');
    status.textContent = `${result.name} was saved to our Google Drive folder. Thank you!`;
    form.elements.file.value = '';
  } catch (error) {
    status.textContent = error instanceof SyntaxError || error instanceof TypeError
      ? 'The upload could not be confirmed. Contact the site owner before retrying.' : error.message;
  } finally { button.disabled = false; }
});
