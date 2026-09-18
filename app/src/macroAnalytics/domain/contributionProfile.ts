export const contributionProfileSexes = ['female', 'male', 'intersex', 'not_disclosed'] as const;
export type ContributionProfileSex = typeof contributionProfileSexes[number];

export type ContributionProfile = Readonly<{
  birthYear: number;
  sex: ContributionProfileSex;
  countryCode: string;
  regionCode: string;
}>;
