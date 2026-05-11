(function () {
  var input = document.getElementById('search-input');
  if (!input) return;

  var noResults = document.getElementById('no-results');
  var laws = document.querySelectorAll('[data-law]');

  function normalize(str) {
    return str.toLowerCase();
  }

  function getTextContent(el) {
    return normalize(el.textContent || '');
  }

  function filter(query) {
    var term = normalize(query.trim());
    var anyVisible = false;

    laws.forEach(function (law) {
      var lawId = law.id;
      var navItem = document.getElementById('nav-' + lawId);
      var paragraphs = law.querySelectorAll('[data-paragraph]');

      if (!term) {
        law.classList.remove('hidden');
        if (navItem) navItem.classList.remove('hidden');
        paragraphs.forEach(function (p) {
          p.classList.remove('hidden');
        });
        anyVisible = true;
        return;
      }

      var lawTitleText = getTextContent(law.querySelector('.law-title') || law);
      var lawVisible = false;

      paragraphs.forEach(function (para) {
        var paraText = getTextContent(para);
        if (paraText.includes(term) || lawTitleText.includes(term)) {
          para.classList.remove('hidden');
          lawVisible = true;
        } else {
          para.classList.add('hidden');
        }
      });

      if (lawTitleText.includes(term)) {
        paragraphs.forEach(function (p) {
          p.classList.remove('hidden');
        });
        lawVisible = true;
      }

      if (lawVisible) {
        law.classList.remove('hidden');
        if (navItem) navItem.classList.remove('hidden');
        anyVisible = true;
      } else {
        law.classList.add('hidden');
        if (navItem) navItem.classList.add('hidden');
      }
    });

    if (noResults) {
      noResults.hidden = !term || anyVisible;
    }
  }

  input.addEventListener('input', function () {
    filter(input.value);
  });
}());
