({
  spec: {
    render: function render() {
      var _n = document.createElement("div"),
          _n2;

      _n2 = document.createElement("span");

      _n2.appendChild(document.createElement("a"));

      _n.appendChild(_n2);

      return _n;
    }
  },
  _node: null
});

({
  spec: {
    render: function render() {
      var _n = document.createElement("div"),
          _n2;

      _n2 = document.createElement("span");

      _n2.appendChild(document.createElement("a"));

      _n2.appendChild(document.createElement("b"));

      _n.appendChild(_n2);

      return _n;
    }
  },
  _node: null
});

({
  spec: {
    render: function render() {
      var _n = document.createElement("div"),
          _n2,
          _n3;

      _n2 = document.createElement("span");
      _n3 = document.createElement("a");
      _n3.className = "two";

      _n2.appendChild(_n3);

      _n.appendChild(_n2);

      return _n;
    }
  },
  _node: null
});
