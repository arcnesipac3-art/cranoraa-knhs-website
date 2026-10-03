/**
 * Section heading for the public school website.
 *
 * Keeps headings consistent: a small-caps kicker, a sentence-case title
 * at a restrained weight, a short accent rule, and an optional lead.
 *
 * @param {string} [kicker]  Small-caps label above the title.
 * @param {string} title      Section title.
 * @param {string} [lead]     Supporting paragraph.
 * @param {'left'|'center'} [align]
 * @param {React.ReactNode} [actions] Right-aligned controls.
 * @param {string} [as]       Heading element tag ('h2' by default).
 * @param {string} [className] Extra classes for the wrapper.
 */
const SectionHeading = ({
  kicker,
  title,
  lead,
  align = 'left',
  actions,
  as: Tag = 'h2',
  className = '',
}) => {
  const centered = align === 'center';

  return (
    <header
      className={`flex flex-col gap-4 md:flex-row md:items-end md:justify-between ${className}`}
    >
      <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
        {kicker && <p className={`public-kicker${centered ? ' text-center' : ''}`}>{kicker}</p>}
        <Tag className={`public-title${kicker ? ' mt-2' : ''}`}>{title}</Tag>
        <div className={`public-rule${centered ? ' public-rule-center' : ''}`} aria-hidden="true" />
        {lead && <p className="public-lead">{lead}</p>}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </header>
  );
};

export default SectionHeading;
