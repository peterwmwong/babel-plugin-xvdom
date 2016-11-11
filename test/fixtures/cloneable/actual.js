var var1 = 1;
var var2 = 2;

<div cloneable className={var1} />;

<div cloneable>
  <span className={var1} />
  <span />
  <span />
</div>;

<div cloneable>
  <span />
  <span className={var1} />
  <span />
</div>;

<div cloneable>
  <span />
  <span />
  <span className={var1} />
</div>;

<div cloneable>
  <span />
  <span className={var1} />
  <span className={var2} />
</div>;
