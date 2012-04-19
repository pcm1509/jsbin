var $live = $('#live'),
    $body = $('body'),
    showlive = $('#showlive')[0],
    throttledPreview = throttle(renderLivePreview, 200),
    killAlerts = '<script>try{window.print=function(){};window.alert=function(){};window.prompt=function(){};window.confirm=function(){};}catch(e){}</script>',
    restoreAlerts = '<script>try{delete window.print;delete window.alert;delete window.prompt;delete window.confirm;}catch(e){}</script>';

var iframedelay = (function () {
  var iframedelay = { active : false },
      iframe = document.createElement('iframe'),
      doc,
      callbackName = '__callback' + (+new Date);

  iframe.style.height = iframe.style.width = '1px';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);
  doc = iframe.contentDocument || iframe.contentWindow.document;

  window[callbackName] = function (width) {
    iframedelay.active = width === 0;
    try {
      iframe.parentNode.removeChild(iframe);
      delete window[callbackName];
    } catch (e){};
  };

  try {
    doc.open();
    doc.write('<script>window.parent.' + callbackName + '(window.innerWidth)</script>');
    doc.close();
  } catch (e) {
    iframedelay.active = true;
  }

  return iframedelay;
}());

function two(s) {
  return (s+'').length < 2 ? '0' + s : s;
}

function renderLivePreview(withalerts) {
  var source = getPreparedCode(),
      remove = $live.find('iframe').length > 0,
      frame = $live.append('<iframe class="stretch" frameBorder="0"></iframe>').find('iframe:first')[0],
      doc = frame.contentDocument || frame.contentWindow.document,
      win = doc.defaultView || doc.parentWindow,
      d = new Date();
 
  // if (!useCustomConsole) console.log('--- refreshing live preview @ ' + [two(d.getHours()),two(d.getMinutes()),two(d.getSeconds())].join(':') + ' ---');

  if (withalerts !== true && jsbin.settings.includejs === false) {
    source = source.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  // strip autofocus from the markup - prevents the focus switching out of the editable area
  source = source.replace(/(<.*?\s)(autofocus)/g, '$1');

  var run = function () {
    var jsbinConsole = jsbin.panels.panels.console.visible ? 'window.top._console' : false;

    doc.open();

    if (debug) {
      doc.write('<pre>' + source.replace(/[<>&]/g, function (m) {
        if (m == '<') return '&lt;';
        if (m == '>') return '&gt;';
        if (m == '"') return '&quot;';
      }) + '</pre>');
    } else {
      // nullify the blocking functions
      // IE requires that this is done in the script, rather than off the window object outside of the doc.write
      if (withalerts !== true) {
        doc.write(killAlerts);
      } else {
        doc.write(restoreAlerts);
      }

      if (jsbinConsole) {
        doc.write('<script>(function(){window.addEventListener && window.addEventListener("error", function (event) { window.top._console.error({ message: event.message }, event.filename + ":" + event.lineno);}, false);}());</script>');

        // doc.write('<script>(function () { var fakeConsole = ' + jsbinConsole + '; if (console != undefined) { for (var k in fakeConsole) { console[k] = fakeConsole[k]; } } else { console = fakeConsole; } })(); window.onerror = function () { console.error.apply(console, arguments); }</script>');
      }

      // almost jQuery Mobile specific - when the page renders
      // it moves the focus over to the live preview - since 
      // we no longer have a "render" panel, our code loses 
      // focus which is damn annoying. So, I cancel the iframe
      // focus event...because I can :)
      var click = false;
      win.onmousedown = function () {
        click = true;
        setTimeout(function () {
          click = false;
        }, 10);
      };
      win.onfocus = function (event) {
        // allow the iframe to be clicked to create a fake focus
        if (click) {
          $('#live').focus();
        }
        return false;
      };

      doc.write(source);
      doc.write(restoreAlerts);
    }
    doc.close();
    delete jsbin.panels.panels.live.doc;
    jsbin.panels.panels.live.doc = doc;

    // by removing the previous iframe /after/ the newly created live iframe
    // has run, it doesn't flicker - which fakes a smooth live update.
    if (remove) $live.find('iframe:last').remove();
  }

  // WebKit requires a wait time before actually writing to the iframe
  // annoyingly it's not consistent (I suspect WebKit is the buggy one)
  if (iframedelay.active) {
    // this setTimeout allows the iframe to be rendered before our code
    // runs - thus allowing us access to the innerWidth, et al
    setTimeout(run, 10);
  } else {
    run();
  }
}