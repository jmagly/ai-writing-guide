(function () {
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; });
    }

    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;top:-9999px;opacity:0';
    document.body.appendChild(textarea);
    textarea.select();
    var copied = document.execCommand('copy');
    textarea.remove();
    return Promise.resolve(copied);
  }

  function addCopyControls() {
    document.querySelectorAll('.doc-content pre').forEach(function (pre) {
      var code = pre.querySelector('code');
      if (!code || pre.querySelector(':scope > .code-copy')) return;

      var button = document.createElement('button');
      var label = document.createElement('span');
      var resetTimer;
      button.type = 'button';
      button.className = 'code-copy';
      button.setAttribute('aria-label', 'Copy code to clipboard');
      label.className = 'code-copy__label';
      label.setAttribute('aria-live', 'polite');
      label.textContent = 'Copy';
      button.appendChild(label);

      button.addEventListener('click', function () {
        var text = code.textContent.replace(/\n$/, '');
        copyText(text).then(function (copied) {
          label.textContent = copied ? 'Copied' : 'Select + copy';
          button.classList.toggle('is-copied', copied);
          button.setAttribute('aria-label', copied ? 'Copied to clipboard' : 'Copy failed; select the code and copy it');
          window.clearTimeout(resetTimer);
          resetTimer = window.setTimeout(function () {
            label.textContent = 'Copy';
            button.classList.remove('is-copied');
            button.setAttribute('aria-label', 'Copy code to clipboard');
          }, 1600);
        }).catch(function () {
          label.textContent = 'Select + copy';
          button.setAttribute('aria-label', 'Copy failed; select the code and copy it');
        });
      });

      pre.classList.add('has-code-copy');
      pre.appendChild(button);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addCopyControls, { once: true });
  } else {
    addCopyControls();
  }
})();
