// Wrap tables so they scroll horizontally on small screens.
export default function Table({ children, ...rest }) {
  return (
    <div className="table-wrap">
      <table {...rest}>{children}</table>
    </div>
  );
}
