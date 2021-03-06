Faye.Transport.XHR = Faye.extend(Faye.Class(Faye.Transport, {
  encode: function(messages) {
    return Faye.toJSON(messages);
  },

  request: function(messages, timeout) {
    var retry = this.retry(messages, timeout),
        path  = this.endpoint.path,
        self  = this,
        xhr   = Faye.ENV.ActiveXObject
              ? new ActiveXObject("Microsoft.XMLHTTP")
              : new XMLHttpRequest();

    xhr.open('POST', path, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Pragma', 'no-cache');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    var headers = this._client.headers;
    for (var key in headers) {
      if (!headers.hasOwnProperty(key)) continue;
      xhr.setRequestHeader(key, headers[key]);
    }

    var abort = function() { xhr.abort() };
    Faye.Event.on(Faye.ENV, 'beforeunload', abort);

    var cleanUp = function() {
      Faye.Event.detach(Faye.ENV, 'beforeunload', abort);
      xhr.onreadystatechange = function() {};
      xhr = null;
    };

    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) return;

      var parsedMessage = null,
          status        = xhr.status,
          successful    = ((status >= 200 && status < 300) ||
                            status === 304 ||
                            status === 1223);

      if (!successful) {
        cleanUp();
        retry();
        return self.trigger('down');
      }

      try {
        parsedMessage = JSON.parse(xhr.responseText);
      } catch (e) {}

      cleanUp();

      if (parsedMessage) {
        self.receive(parsedMessage);
        self.trigger('up');
      } else {
        retry();
        self.trigger('down');
      }
    };

    xhr.send(this.encode(messages));
  }
}), {
  isUsable: function(client, endpoint, callback, context) {
    callback.call(context, Faye.URI.isSameOrigin(endpoint));
  }
});

Faye.Transport.register('long-polling', Faye.Transport.XHR);
