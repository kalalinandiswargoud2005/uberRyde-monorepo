export default function UnprotectedLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}