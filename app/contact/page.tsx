'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { PageContainer } from '@/components/layout/page-container';

const contactSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상 입력해주세요.'),
  email: z.string().email('올바른 이메일 주소를 입력해주세요.'),
  subject: z.string().min(5, '제목은 5자 이상 입력해주세요.'),
  message: z.string().min(10, '내용은 10자 이상 입력해주세요.'),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  async function onSubmit(data: ContactFormValues) {
    // Simulate async submission
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Form submitted:', data);
    toast.success('문의가 성공적으로 전송되었습니다!', {
      description: '빠른 시일 내에 답변 드리겠습니다.',
    });
    reset();
  }

  return (
    <PageContainer className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">문의하기</h1>
        <p className="text-muted-foreground mt-2">
          궁금한 점이 있으시면 아래 양식을 작성해 주세요.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">이름</FieldLabel>
            <Input
              id="name"
              placeholder="홍길동"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            <FieldError errors={errors.name ? [errors.name] : []} />
          </Field>

          <Field>
            <FieldLabel htmlFor="email">이메일</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            <FieldError errors={errors.email ? [errors.email] : []} />
          </Field>

          <Field>
            <FieldLabel htmlFor="subject">제목</FieldLabel>
            <Input
              id="subject"
              placeholder="문의 제목을 입력해주세요"
              aria-invalid={!!errors.subject}
              {...register('subject')}
            />
            <FieldError errors={errors.subject ? [errors.subject] : []} />
          </Field>

          <Field>
            <FieldLabel htmlFor="message">내용</FieldLabel>
            <Textarea
              id="message"
              placeholder="문의 내용을 입력해주세요"
              rows={5}
              aria-invalid={!!errors.message}
              {...register('message')}
            />
            <FieldDescription>최소 10자 이상 입력해주세요.</FieldDescription>
            <FieldError errors={errors.message ? [errors.message] : []} />
          </Field>

          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? '전송 중...' : '문의 전송'}
          </Button>
        </FieldGroup>
      </form>
    </PageContainer>
  );
}
