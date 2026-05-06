import React from 'react';
import Markdown from '@educandu/educandu/components/markdown.js';
import { sectionDisplayProps } from '@educandu/educandu/ui/default-prop-types.js';

export default function ChartsDisplay({ content }) {
  return (
    <div className="EP_Musikisum_Charts_Display">
      <div className={`u-horizontally-centered u-width-${content.width}`}>
        <Markdown renderAnchors>
          {content.text}
        </Markdown>
      </div>
    </div>
  );
}

ChartsDisplay.propTypes = {
  ...sectionDisplayProps
};
