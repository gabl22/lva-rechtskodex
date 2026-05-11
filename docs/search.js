(function () {
  var input = document.getElementById('search-input');
  if (!input) return;

  var noResults = document.getElementById('no-results');
  var laws = document.querySelectorAll('[data-law]');

  // Store original text content for each element
  var originalContent = new Map();

  function storeOriginalContent() {
    laws.forEach(function (law) {
      var paragraphs = law.querySelectorAll('[data-paragraph]');
      paragraphs.forEach(function (para) {
        var textElements = para.querySelectorAll('.paragraph-text, .subparagraph');
        textElements.forEach(function (el) {
          if (!originalContent.has(el)) {
            originalContent.set(el, el.innerHTML);
          }
        });
      });

      var lawTitle = law.querySelector('.law-title');
      if (lawTitle && !originalContent.has(lawTitle)) {
        originalContent.set(lawTitle, lawTitle.innerHTML);
      }
    });
  }

  storeOriginalContent();

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function createRegex(query) {
    try {
      // Check if query looks like it's trying to use regex patterns
      // Support word boundaries with \b or start of word with ^
      var hasRegexChars = /[.*+?^${}()|[\]\\]/.test(query);

      if (hasRegexChars) {
        // User is trying to use regex, parse it
        return new RegExp(query, 'gi');
      } else {
        // Simple text search with word boundary support
        // This will match "Hoh" at word start in "Hoher Rat"
        var escaped = escapeRegExp(query);
        return new RegExp(escaped, 'gi');
      }
    } catch (e) {
      // If regex is invalid, fall back to escaped literal search
      return new RegExp(escapeRegExp(query), 'gi');
    }
  }

  function highlightText(element, regex) {
    var original = originalContent.get(element);
    if (!original) return;

    var highlighted = original.replace(regex, function(match) {
      return '<mark class="highlight">' + match + '</mark>';
    });

    element.innerHTML = highlighted;
  }

  function removeHighlights(element) {
    var original = originalContent.get(element);
    if (original) {
      element.innerHTML = original;
    }
  }

  function matchesQuery(text, regex) {
    return regex.test(text);
  }

  function filter(query) {
    var term = query.trim();
    var anyVisible = false;

    if (!term) {
      // Clear all highlights and show everything
      laws.forEach(function (law) {
        var lawId = law.id;
        var navItem = document.getElementById('nav-' + lawId);
        var paragraphs = law.querySelectorAll('[data-paragraph]');

        law.classList.remove('hidden');
        if (navItem) navItem.classList.remove('hidden');

        paragraphs.forEach(function (p) {
          p.classList.remove('hidden');
          var textElements = p.querySelectorAll('.paragraph-text, .subparagraph');
          textElements.forEach(removeHighlights);
        });

        var lawTitle = law.querySelector('.law-title');
        if (lawTitle) removeHighlights(lawTitle);
      });

      if (noResults) noResults.hidden = true;
      return;
    }

    var regex = createRegex(term);

    laws.forEach(function (law) {
      var lawId = law.id;
      var navItem = document.getElementById('nav-' + lawId);
      var paragraphs = law.querySelectorAll('[data-paragraph]');
      var lawTitle = law.querySelector('.law-title');
      var lawTitleText = lawTitle ? (originalContent.get(lawTitle) || lawTitle.textContent) : '';

      // Reset regex for each test
      regex.lastIndex = 0;
      var lawTitleMatches = matchesQuery(lawTitleText, regex);
      var lawVisible = false;

      paragraphs.forEach(function (para) {
        var textElements = para.querySelectorAll('.paragraph-text, .subparagraph');
        var paraMatches = false;

        textElements.forEach(function (el) {
          var originalText = originalContent.get(el) || el.textContent;
          regex.lastIndex = 0;

          if (matchesQuery(originalText, regex) || lawTitleMatches) {
            paraMatches = true;
          }
        });

        if (paraMatches || lawTitleMatches) {
          para.classList.remove('hidden');
          lawVisible = true;

          // Highlight matches in this paragraph
          textElements.forEach(function (el) {
            regex.lastIndex = 0;
            highlightText(el, regex);
          });
        } else {
          para.classList.add('hidden');
          textElements.forEach(removeHighlights);
        }
      });

      if (lawTitleMatches) {
        paragraphs.forEach(function (p) {
          p.classList.remove('hidden');
          var textElements = p.querySelectorAll('.paragraph-text, .subparagraph');
          textElements.forEach(function (el) {
            regex.lastIndex = 0;
            highlightText(el, regex);
          });
        });
        lawVisible = true;
        regex.lastIndex = 0;
        highlightText(lawTitle, regex);
      } else if (lawTitle) {
        removeHighlights(lawTitle);
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
