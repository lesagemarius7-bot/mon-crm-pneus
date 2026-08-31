"use client";

import Papa from "papaparse";

/**
 * Triggers a browser download of `rows` as a CSV file. `columns` controls
 * both the column order and the (clean, French) header labels — keys are
 * read off each row via simple property access.
 */
export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  columns: { key: keyof T & string; label: string }[],
  rows: T[]
) {
  const csv = Papa.unparse({
    fields: columns.map((c) => c.label),
    data: rows.map((row) => columns.map((c) => row[c.key] ?? "")),
  });

  // Prepend a UTF-8 BOM so accented headers/values open correctly in Excel.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

/** Parses a CSV File entirely client-side (header row -> keyed rows). */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          headers: results.meta.fields ?? [],
          rows: results.data,
        });
      },
      error: (error: Error) => reject(error),
    });
  });
}
