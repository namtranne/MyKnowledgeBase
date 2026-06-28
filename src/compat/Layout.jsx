// Compatibility shim replacing Docusaurus's @theme/Layout.
// The app chrome (navbar) is provided by PlainLayout in App, so this
// simply renders the page content. title/description props are ignored.
export default function Layout({ children }) {
  return <>{children}</>;
}
