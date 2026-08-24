import type { ChapterHeadingSettings, ManuscriptDocument, NovelProject } from './types';

export const DEFAULT_CHAPTER_HEADING: ChapterHeadingSettings = {
	showLabel: true,
	labelTemplate: 'Chapter {number}',
	showTitle: true
};

export function bookChapterHeading(project: NovelProject): ChapterHeadingSettings {
	return project.chapterHeading ?? DEFAULT_CHAPTER_HEADING;
}

export function documentChapterHeading(
	project: NovelProject,
	document: ManuscriptDocument
): ChapterHeadingSettings {
	return document.chapterHeadingOverride ?? bookChapterHeading(project);
}

export function chapterLabel(template: string, number: number | undefined): string {
	return template.replaceAll('{number}', number === undefined ? '' : String(number)).trim();
}
