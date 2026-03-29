import { describe, expect, it } from "vitest";

import { extractArticleContextFromHtml } from "../src/providers/articleContextProvider";

describe("articleContextProvider", () => {
  it("extracts concrete evidence from article html", () => {
    const html = `
      <html>
        <head>
          <meta property="og:description" content="Officials said 12 demonstrators were arrested after crowds pushed toward the statehouse." />
        </head>
        <body>
          <article>
            <h2>Organizers call it the biggest march of the spring</h2>
            <p>Police in Denver and Austin said 12 demonstrators were arrested after crowds pushed toward the statehouse.</p>
            <p>Organizers said the "No Kings" protests spread to more than 20 cities, with rallies targeting immigration raids and emergency powers.</p>
          </article>
        </body>
      </html>
    `;

    const context = extractArticleContextFromHtml(
      html,
      "Fallback description for the article",
    );

    expect(context.summary).toEqual(expect.stringMatching(/12 demonstrators were arrested|20 cities/));
    expect(context.evidence).toEqual(
      expect.arrayContaining([
        expect.stringContaining("20 cities"),
        expect.stringContaining("\"No Kings\" protests spread"),
      ]),
    );
  });
});
