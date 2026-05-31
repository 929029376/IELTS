import { Activity, BookOpenCheck, Database, Headphones, LineChart, Timer } from "lucide-react";
import "./app.css";

const cards = [
  {
    title: "Mock Exam Center",
    description: "Strict IELTS-style listening and reading tests with timer and score estimate.",
    Icon: Timer
  },
  {
    title: "Intensive Practice Center",
    description: "Focused listening repeat, reading review, answer evidence, and mistake labels.",
    Icon: Headphones
  },
  {
    title: "Question Bank",
    description: "Import local listening ZIPs, reading PDFs, and frequency tables.",
    Icon: Database
  },
  {
    title: "Progress Analytics",
    description: "Track history, accuracy, weak question types, and predicted score ranges.",
    Icon: LineChart
  }
];

export function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-mark">
          <BookOpenCheck size={24} aria-hidden="true" />
          <span>IELTS</span>
        </div>
        <nav className="nav-list">
          <a className="nav-item active" href="#dashboard">
            Dashboard
          </a>
          <a className="nav-item" href="#mock">
            Mock Exams
          </a>
          <a className="nav-item" href="#practice">
            Practice
          </a>
          <a className="nav-item" href="#bank">
            Question Bank
          </a>
          <a className="nav-item" href="#reports">
            Reports
          </a>
        </nav>
      </aside>

      <section id="dashboard" className="dashboard">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Local-first IELTS preparation</p>
            <h1>IELTS Local Practice</h1>
          </div>
          <div className="status-pill">
            <Activity size={16} aria-hidden="true" />
            Phase 0 bootstrap
          </div>
        </header>

        <section className="summary-grid" aria-label="Preparation modules">
          {cards.map(({ title, description, Icon }) => (
            <article className="module-card" key={title}>
              <div className="module-icon">
                <Icon size={22} aria-hidden="true" />
              </div>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
