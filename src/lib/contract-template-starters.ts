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
<h3>2. Consideration</h3>
<p>The value of the transaction is {{dealCurrency}} {{dealValue}}.</p>
<h3>3. Conditions</h3>
<p>The obligations of the parties are subject to the conditions precedent set out in this agreement.</p>
<h3>4. Confidentiality</h3>
<p>Each party shall keep the terms of this agreement and the transaction confidential.</p>
<h3>5. Timetable</h3>
<p>The target completion date is {{targetCloseDate}} and the longstop date is {{longstopDate}}.</p>
<h3>6. Governing law</h3>
<p>This agreement is governed by the laws of {{governingLaw}}.</p>
<h3>Signatures</h3>
<p>Signed at {{signingVenue}} on {{signingDate}}.</p>
<p>For {{partyAName}}: {{partyARepresentative}}, {{partyARepresentativeTitle}}</p>
<p>For {{partyBName}}: {{partyBRepresentative}}, {{partyBRepresentativeTitle}}</p>
<p>{{signatoriesList}}</p>
`.trim();

export const TERM_SHEET_STARTER = `
<h1>{{title}}</h1>
<p>between {{partyAName}} (as First Party) and {{partyBName}} (as Second Party). Effective date {{effectiveDate}}.</p>
<h2>1. Parties and background</h2>
<p>This term sheet is entered into on the effective date between:</p>
<p>(a) {{partyAName}}, a {{partyAEntityType}} incorporated under the laws of {{partyAJurisdiction}} with registration number {{partyARegistrationNumber}}, whose registered office is at {{partyAAddress}} (the "First Party"); and</p>
<p>(b) {{partyBName}}, a {{partyBEntityType}} incorporated under the laws of {{partyBJurisdiction}} with registration number {{partyBRegistrationNumber}}, whose registered office is at {{partyBAddress}} (the "Second Party").</p>
<h2>2. Status of this term sheet</h2>
<p>Except for the binding provisions, this term sheet is a statement of intent only and does not oblige either party to complete the transaction.</p>
<h2>3. Principal terms</h2>
<p>The parties propose a joint venture to {{jvPurpose}} in {{territory}}, held {{partyAPct}}% by the First Party and {{partyBPct}}% by the Second Party.</p>
<h2>4. Conditions</h2>
<p>Completion is conditional on regulatory approval from {{regulatoryAuthority}}. The long-stop date is {{cpLongstopDate}}.</p>
<h2>5. Exclusivity</h2>
<p>For {{exclusivityDays}} days from the effective date neither party will negotiate a competing transaction.</p>
<h2>6. Confidentiality</h2>
<p>The terms of this term sheet are confidential and survive for {{confidentialitySurvivalYears}} years.</p>
<h2>7. Dispute resolution</h2>
<p>Disputes are referred to mediation before {{mediationBody}} and then to arbitration seated in {{arbitrationSeat}}.</p>
<h2>8. Governing law</h2>
<p>This term sheet is governed by the laws of {{governingLaw}}.</p>
<h2>Signatures</h2>
<p>For {{partyAName}}: {{partyASignatory}}, {{partyATitle}}</p>
<p>For {{partyBName}}: {{partyBSignatory}}, {{partyBTitle}}</p>
`.trim();

export const starterFor = (
  moduleKey: string,
  areaKey?: string | null,
): { label: string; html: string } | null =>
  moduleKey === "grc" && areaKey === "deals"
    ? { label: "Deal contract outline", html: DEAL_CONTRACT_STARTER }
    : moduleKey === "grc" && areaKey === "term_sheets"
      ? { label: "Term sheet outline", html: TERM_SHEET_STARTER }
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
