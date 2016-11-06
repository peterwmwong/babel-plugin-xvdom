const msg = "hello";
function translate(str) {
  return str;
}

<div className={msg}></div>;
<div className={msg + "hello"} title={translate(msg)}></div>;
