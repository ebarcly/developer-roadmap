import { useEffect, useState } from 'react';
import { httpGet, httpPatch, httpPost } from '../lib/http';
import { sponsorHidden } from '../stores/page';
import { useStore } from '@nanostores/react';
import { X } from 'lucide-react';
import { setViewSponsorCookie } from '../lib/jwt';
import { isMobile } from '../lib/is-mobile';

export type PageSponsorType = {
  company: string;
  description: string;
  gaLabel: string;
  imageUrl: string;
  pageUrl: string;
  title: string;
  url: string;
};

type V1GetSponsorResponse = {
  id?: string;
  href?: string;
  sponsor?: PageSponsorType;
};

type PageSponsorProps = {
  gaPageIdentifier?: string;
};

export function PageSponsor(props: PageSponsorProps) {
  const { gaPageIdentifier } = props;
  const $isSponsorHidden = useStore(sponsorHidden);

  const [sponsorId, setSponsorId] = useState<string | null>(null);
  const [sponsor, setSponsor] = useState<PageSponsorType>();

  const loadSponsor = async () => {
    const currentPath = window.location.pathname;
    if (
      currentPath === '/' ||
      currentPath === '/best-practices' ||
      currentPath === '/roadmaps' ||
      currentPath.startsWith('/guides') ||
      currentPath.startsWith('/videos') ||
      currentPath.startsWith('/account') ||
      currentPath.startsWith('/team')
    ) {
      return;
    }

    const { response, error } = await httpGet<V1GetSponsorResponse>(
      `${import.meta.env.PUBLIC_API_URL}/v1-get-sponsor`,
      {
        href: window.location.pathname,
        mobile: isMobile() ? 'true' : 'false',
      },
    );

    if (error) {
      console.error(error);
      return;
    }

    if (!response?.sponsor) {
      return;
    }

    setSponsor(response.sponsor);
    setSponsorId(response?.id || null);

    window.fireEvent({
      category: 'SponsorImpression',
      action: `${response.sponsor?.company} Impression`,
      label:
        response.sponsor.gaLabel ||
        `${gaPageIdentifier} / ${response.sponsor?.company} Link`,
    });
  };

  const clickSponsor = async (sponsorId: string) => {
    const clickUrl = new URL(
      `${import.meta.env.PUBLIC_API_URL}/v1-view-sponsor/${sponsorId}`,
    );
    clickUrl.searchParams.set('mobile', isMobile() ? 'true' : 'false');

    const { response, error } = await httpPatch<{ status: 'ok' }>(
      clickUrl.toString(),
      {},
    );

    if (error || !response) {
      console.error(error);
      return;
    }

    setViewSponsorCookie(sponsorId);
  };

  useEffect(() => {
    window.setTimeout(loadSponsor);
  }, []);

  if ($isSponsorHidden || !sponsor) {
    return null;
  }

  const { url, title, imageUrl, description, company, gaLabel } = sponsor;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener sponsored nofollow"
      className="fixed bottom-[15px] right-[15px] z-50 flex max-w-[350px] bg-white shadow-lg outline-0 outline-transparent"
      onClick={async () => {
        window.fireEvent({
          category: 'SponsorClick',
          action: `${company} Redirect`,
          label: gaLabel || `${gaPageIdentifier} / ${company} Link`,
        });
        await clickSponsor(sponsorId || '');
      }}
    >
      <span
        className="absolute right-1.5 top-1.5 text-gray-300 hover:text-gray-800"
        aria-label="Close"
        onClick={(e) => {
          e.preventDefault();
          sponsorHidden.set(true);
        }}
      >
        <X className="h-4 w-4" />
      </span>
      <img
        src={imageUrl}
        className="block h-[150px] object-cover lg:h-[169px] lg:w-[118.18px]"
        alt="Sponsor Banner"
      />
      <span className="flex flex-1 flex-col justify-between text-sm">
        <span className="p-[10px]">
          <span className="mb-0.5 block font-semibold">{title}</span>
          <span className="block text-gray-500">{description}</span>
        </span>
        <span className="sponsor-footer">Partner Content</span>
      </span>
    </a>
  );
}
