export interface StateDisclosure {
  id: string;
  label: string;
  text: string;
}

export const STATE_DISCLOSURES: Record<string, StateDisclosure[]> = {
  CA: [
    {
      id: "rent_control",
      label: "Rent Control Disclosure",
      text: "I acknowledge that this property may be subject to California rent control laws."
    },
    {
      id: "megans_law",
      label: "Megan’s Law Disclosure",
      text: "I understand that information about registered sex offenders is available at www.meganslaw.ca.gov."
    }
  ],
  NY: [
    {
      id: "fee_cap",
      label: "Application Fee Cap Disclosure",
      text: "I understand that New York law limits application fees to the legally allowed maximum."
    }
  ],
  TX: [
    {
      id: "no_rent_control",
      label: "No Rent Control Notice",
      text: "I understand that Texas does not impose statewide rent control regulations."
    }
  ]
};

export function getRequiredDisclosures(state: string | null | undefined): StateDisclosure[] {
  if (!state) return [];
  const normalizedState = state.toUpperCase().trim();
  return STATE_DISCLOSURES[normalizedState] || [];
}