import { Link } from 'react-router-dom';

/**
 * Interior page header for the public school website.
 *
 * Renders a restrained, official-looking masthead: breadcrumb trail,
 * optional kicker (small-caps label), page title, accent rule and lead
 * paragraph. Consistent across every public page.
 *
 * @param {Array<{label: string, to?: string}>} breadcrumb
 *        Trail from Home down to the current page. The last entry is
 *        rendered as the current page (not a link).
 * @param {string} [kicker] Small-caps label shown above the title.
 * @param {string} title    Page title (rendered as h1).
 * @param {string} [lead]   Supporting paragraph under the title.
 * @param {React.ReactNode} [actions] Optional right-aligned actions.
 */
const PageHero = ({ breadcrumb = [], kicker, title, lead, actions }) => {
  return (
    <section className="public-hero">
      <div className="public-shell py-9 md:py-14">
        {breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="public-crumb">
            {breadcrumb.map((crumb, index) => {
              const isLast = index === breadcrumb.length - 1;
              return (
                <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-2">
                  {index > 0 && (
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {crumb.to && !isLast ? (
                    <Link to={crumb.to}>{crumb.label}</Link>
                  ) : (
                    <span aria-current={isLast ? 'page' : undefined}>{crumb.label}</span>
                  )}
                </span>
              );
            })}
          </nav>
        )}

        <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            {kicker && <p className="public-kicker">{kicker}</p>}
            <h1 className={`public-hero-title${kicker ? ' mt-2' : ''}`}>{title}</h1>
            <div className="public-rule" aria-hidden="true" />
            {lead && <p className="public-hero-copy">{lead}</p>}
          </div>

          {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
        </div>
      </div>
    </section>
  );
};

export default PageHero;
