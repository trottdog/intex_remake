import handsImg from "@assets/Hands_Circle_1775623133974.jpg";
import jumpImg from "@assets/BackwardsJump-e1741389606772_1775623133972.jpg";
import circleImg from "@assets/GreenGrassFingerStar-e1741389539890_1775623133974.jpg";
import pinkImg from "@assets/PinkShirtPinkFlower-768x705_1775623133974.jpg";
import sunsetImg from "@assets/SunsetArmsUp_1775623133974.jpg";
import beachImg from "@assets/HoldingHandsAtBeach_1775623758874.jpg";

export type SocialFeedPost = {
  platform: string;
  date: string;
  caption: string;
  image: string;
  likes: number;
  shares: number;
  comments: number;
  views: number;
};

export const SOCIAL_FEED_POSTS: SocialFeedPost[] = [
  {
    platform: "Instagram",
    date: "April 5, 2026",
    caption: "Our girls learned floral arrangement this week — and created something absolutely beautiful. Creativity is part of healing. #BeaconSanctuaryPH #Hope",
    image: pinkImg,
    likes: 284,
    shares: 131,
    comments: 31,
    views: 5496,
  },
  {
    platform: "Facebook",
    date: "March 28, 2026",
    caption: "Today marks 5 years since our second safe home opened. From 8 beds to 18 — and counting. Every bed is a life saved. Thank you to every donor who made this possible.",
    image: handsImg,
    likes: 512,
    shares: 515,
    comments: 87,
    views: 11432,
  },
  {
    platform: "Instagram",
    date: "March 20, 2026",
    caption: "They held hands. They jumped. They laughed. This is what freedom looks like. #SafeHome #BeaconPH",
    image: jumpImg,
    likes: 743,
    shares: 40,
    comments: 54,
    views: 2597,
  },
  {
    platform: "Facebook",
    date: "March 15, 2026",
    caption: "Day 3 of our Summer Camp! The girls formed a star with their fingers — a symbol of unity and light. These moments remind us why we do this work.",
    image: circleImg,
    likes: 398,
    shares: 33,
    comments: 42,
    views: 5649,
  },
  {
    platform: "Instagram",
    date: "March 8, 2026",
    caption: "International Women's Day — we celebrate you. Every girl here is a future leader, healer, and changemaker.",
    image: sunsetImg,
    likes: 621,
    shares: 17,
    comments: 93,
    views: 1235,
  },
  {
    platform: "Facebook",
    date: "February 22, 2026",
    caption: "The ocean reminds us: no matter how many waves hit you, you keep standing. We are so proud of our girls.",
    image: beachImg,
    likes: 891,
    shares: 398,
    comments: 126,
    views: 3684,
  },
];
