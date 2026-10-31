// Starting outlines a Super Admin can drop into an empty template, so a
// new one begins as a structure of real fields instead of a blank page.
// Every {{token}} here must exist in the engine's merge-field registry.

export const DEAL_CONTRACT_STARTER = `
<h2>{{title}}</h2>
<p>Reference {{contractReference}}. This agreement is made on {{effectiveDate}} between {{partyAName}} of {{partyAAddress}} ("Party A") and {{partyBName}} of {{partyBAddress}} ("Party B").</p>
<p>The parties to the transaction are:</p>
<p>{{partiesList}}</p>
<h3>1. The transaction</h3>
<p>This agreement relates to {{dealName}} ({{dealType}}) between {{clientName}} and {{dealCounterpartyName}}.</p>
<p>{{termSheetStructure}}</p>
<h3>2. Consideration</h3>
<p>The value of the transaction is {{dealCurrency}} {{dealValue}}.</p>
<p>{{termSheetConsideration}}</p>
<h3>3. Conditions</h3>
<p>{{termSheetConditions}}</p>
<h3>4. Exclusivity and confidentiality</h3>
<p>{{termSheetExclusivity}}</p>
<p>{{termSheetConfidentiality}}</p>
<h3>5. Timetable</h3>
<p>The target completion date is {{targetCloseDate}} and the longstop date is {{longstopDate}}.</p>
<p>{{termSheetTimeline}}</p>
<h3>6. Governing law</h3>
<p>This agreement is governed by the laws of {{governingLaw}}.</p>
<h3>Signatures</h3>
<p>Signed at {{signingVenue}} on {{signingDate}}.</p>
<p>For {{partyAName}}: {{partyARepresentative}}, {{partyARepresentativeTitle}}</p>
<p>For {{partyBName}}: {{partyBRepresentative}}, {{partyBRepresentativeTitle}}</p>
<p>{{signatoriesList}}</p>
`.trim();

export const starterFor = (
  moduleKey: string,
  areaKey?: string | null,
): { label: string; html: string } | null =>
  moduleKey === "grc" && areaKey === "deals"
    ? { label: "Deal contract outline", html: DEAL_CONTRACT_STARTER }
    : null;

// A cover page that works for any module: it uses only the common fields,
// which every contract is filled with. It is centred automatically.
export const COVER_PAGE_STARTER = `
<h1>{{title}}</h1>
<p>between</p>
<p><strong>{{partyAName}}</strong></p>
<p>and</p>
<p><strong>{{partyBName}}</strong></p>
<p>Effective {{effectiveDate}}</p>
<p>Reference {{contractReference}}</p>
`.trim();
