export default function Footer() {
  return (
    <footer className="bg-primary-950 text-white/70 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm flex flex-col md:flex-row justify-between gap-4">
        <div>
          <p className="text-white font-serif font-semibold">Mushalla Al Amanah</p>
          <p>GKN I Denpasar</p>
        </div>
        <p>&copy; {new Date().getFullYear()} Mushalla Al Amanah GKN I Denpasar. Semua hak cipta dilindungi.</p>
      </div>
    </footer>
  );
}
