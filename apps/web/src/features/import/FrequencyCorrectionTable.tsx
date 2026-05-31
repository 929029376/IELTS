export interface FrequencyCorrectionRow {
  subject: "listening" | "reading";
  part: "P1" | "P2" | "P3" | "P4";
  englishTitle: string;
  chineseTitle: string;
  frequencyClass: "high" | "medium" | "low" | "unknown";
  difficulty: string;
  sourceMonth: string;
}

export interface FrequencyCorrectionTableProps {
  rows: FrequencyCorrectionRow[];
  onRowsChange: (rows: FrequencyCorrectionRow[]) => void;
  onImport: (rows: FrequencyCorrectionRow[]) => void;
}

export function FrequencyCorrectionTable({
  rows,
  onRowsChange,
  onImport
}: FrequencyCorrectionTableProps) {
  function updateRow(index: number, patch: Partial<FrequencyCorrectionRow>) {
    onRowsChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  return (
    <section aria-label="Frequency table correction">
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Part</th>
            <th>English title</th>
            <th>Chinese title</th>
            <th>Frequency</th>
            <th>Difficulty</th>
            <th>Month</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.subject}-${row.part}-${row.englishTitle}-${index}`}>
              <td>
                <select
                  aria-label={`Subject row ${index + 1}`}
                  value={row.subject}
                  onChange={(event) =>
                    updateRow(index, { subject: event.target.value as FrequencyCorrectionRow["subject"] })
                  }
                >
                  <option value="reading">Reading</option>
                  <option value="listening">Listening</option>
                </select>
              </td>
              <td>
                <select
                  aria-label={`Part row ${index + 1}`}
                  value={row.part}
                  onChange={(event) =>
                    updateRow(index, { part: event.target.value as FrequencyCorrectionRow["part"] })
                  }
                >
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                </select>
              </td>
              <td>
                <input
                  aria-label={`English title row ${index + 1}`}
                  value={row.englishTitle}
                  onChange={(event) => updateRow(index, { englishTitle: event.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`Chinese title row ${index + 1}`}
                  value={row.chineseTitle}
                  onChange={(event) => updateRow(index, { chineseTitle: event.target.value })}
                />
              </td>
              <td>
                <select
                  aria-label={`Frequency row ${index + 1}`}
                  value={row.frequencyClass}
                  onChange={(event) =>
                    updateRow(index, {
                      frequencyClass: event.target.value as FrequencyCorrectionRow["frequencyClass"]
                    })
                  }
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="unknown">Unknown</option>
                </select>
              </td>
              <td>
                <input
                  aria-label={`Difficulty row ${index + 1}`}
                  value={row.difficulty}
                  onChange={(event) => updateRow(index, { difficulty: event.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`Source month row ${index + 1}`}
                  value={row.sourceMonth}
                  onChange={(event) => updateRow(index, { sourceMonth: event.target.value })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => onImport(rows)}>
        Import corrected frequency rows
      </button>
    </section>
  );
}
