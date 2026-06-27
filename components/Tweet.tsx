import type { ReactNode } from "react";

type TweetProps = {
  url: string;
  name: string;
  handle: string;
  date: string;
  verified?: boolean;
  avatar?: string;
  image?: string;
  imageAlt?: string;
  video?: string;
  poster?: string;
  children?: ReactNode;
};

// 正文里嵌一条 X/Twitter 预览卡：纯静态、不引第三方脚本、不发外部请求，
// 整卡是一个指向原推的链接。样式见 globals.css 的 .tweet-card。
export function Tweet({
  url,
  name,
  handle,
  date,
  verified,
  avatar,
  image,
  imageAlt,
  video,
  poster,
  children,
}: TweetProps) {
  return (
    <a
      className="tweet-card"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="tweet-head">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="tweet-avatar" src={avatar} alt="" />
        ) : (
          <span className="tweet-avatar tweet-avatar-fallback" aria-hidden="true">
            {name.trim().charAt(0)}
          </span>
        )}
        <span className="tweet-id">
          <span className="tweet-name">
            {name}
            {verified && (
              <svg
                className="tweet-verified"
                viewBox="0 0 22 22"
                aria-label="Verified account"
                role="img"
              >
                <path
                  fill="currentColor"
                  d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
                />
              </svg>
            )}
          </span>
          <span className="tweet-handle">@{handle}</span>
        </span>
        <svg
          className="tweet-logo"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
          />
        </svg>
      </div>
      {children && <div className="tweet-text">{children}</div>}
      {video ? (
        // 静音循环自动播放、无控件——和原推一样是段无声短片，点哪都跳转原推
        <span className="tweet-media">
          <video
            src={video}
            poster={poster}
            aria-label={imageAlt || undefined}
            loop
            muted
            playsInline
            autoPlay
            preload="metadata"
          />
        </span>
      ) : (
        image && (
          <span className="tweet-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={imageAlt ?? ""} loading="lazy" />
          </span>
        )
      )}
      <div className="tweet-foot">{date}</div>
    </a>
  );
}
