import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';

import format from 'date-fns/format';
import { ptBR } from 'date-fns/locale';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';

import Header from '../../components/Header';
// import Comments from '../../components/Comments';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Link from 'next/link';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  navigation: {
    prevPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
    nextPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
  };
}

export default function Post({ post, navigation }: PostProps) {
  // TODO
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>
  }

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));

    return total;
  }, 0);

  const readingTime = Math.ceil(totalWords / 200);

  const formatedFirstPublicationDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    { locale: ptBR }
  )

  const formatedLastPublicationDate = format(
    new Date(post.last_publication_date),
    'dd MMM yyyy',
    { locale: ptBR }
  )

  const formatedLastPublicationHour = format(
    new Date(post.last_publication_date),
    'hh:mm',
    { locale: ptBR }
  )

  return (
    <>
      <Head>
        <title>{`${post.data.title} | spacetraveling`}</title>
      </Head>
      <Header />
      <img src={post.data.banner.url} alt={post.data.title} className={styles.banner} />
      <div className={styles.container}>
        <article>
          <header>
            <h1>{post.data.title}</h1>

            <footer>
              <div>
                <FiCalendar size={'1.25rem'} className={styles.icon} />
                <time>{formatedFirstPublicationDate}</time>
              </div>
              <div>
                <FiUser size={'1.25rem'} className={styles.icon} />
                <p>{post.data.author}</p>
              </div>
              <div>
                <FiClock size={'1.25rem'} className={styles.icon} />
                <p>{`${readingTime} min`}</p>
              </div>
            </footer>

            {post.last_publication_date &&
            (<time>
              {`* editado em ${formatedLastPublicationDate}, às ${formatedLastPublicationHour}`}
            </time>)}
          </header>


          {post.data.content.map((item, index) => (
            <div key={item.heading}>
              <h2>{item.heading}</h2>
              <div
                className={styles.postContent}
                dangerouslySetInnerHTML={
                  { __html: RichText.asHtml(item.body) }
                }
              />
            </div>
          ))}
        </article>

        <hr/>

        <section className={styles.navigation}>
          {navigation?.prevPost.length > 0 && (
            <div className={styles.prevPost}>
              <h3>{navigation.prevPost[0].data.title}</h3>
              <Link href={`/post/${navigation.prevPost[0].uid}`}>
                <a>Post anterior</a>
              </Link>
            </div>
          )}

          {navigation?.nextPost.length > 0 && (
            <div className={styles.nextPost}>
              <h3>{navigation.nextPost[0].data.title}</h3>
              <Link href={`/post/${navigation.nextPost[0].uid}`}>
                <a>Próximo post</a>
              </Link>
            </div>
          )}
        </section>

        {/* <Comments /> */}
      </div>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ]);

  // TODO
  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid
      }
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  previewData
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref || null,
  });

  const prevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date desc]',
    }
  );

  // TODO
  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(item => {
        return {
          heading: item.heading,
          body: [...item.body],
        }
      }),
    },
  };

  return {
    props: {
      post,
      navigation: {
        prevPost: prevPost?.results,
        nextPost: nextPost?.results,
      },
    },
    revalidate: 60 * 30 // 30 minutes
  }
};