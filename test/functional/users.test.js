import bcrypt from 'bcrypt'
import { prisma } from '~/data'

import { generateToken, verifyToken } from '~/modules/users/services'

beforeEach(async () => {
    await prisma.user.deleteMany({})
    await prisma.transaction.deleteMany({})
})

async function createAuthUser(userData) {
    const data = {
        email: 'marcos@email.com',
        name: 'john',
        password: '123456',
        ...userData,
    }
    const rawPassword = data.password

    data.password = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({ data })
    const token = generateToken({ sub: user.id })

    return { user, token, rawPassword }
}

describe('User routes', () => {
    it('given wrong email it should return not found', async () => {
        const email = 'useremail@mai.com'
        const password = '123456'

        const response = await global.testRequest
            .get('/login')
            .auth(email, password)

        expect(response.status).toBe(404)
    })

    it('given wrong password it should return not found', async () => {
        const email = 'marcos@email.com'
        const password = 'some-password'

        await prisma.user.create({
            data: { email, password: 'fake-pass' },
        })

        const response = await global.testRequest
            .get('/login')
            .auth(email, password)

        expect(response.status).toBe(404)
    })

    it('should return logged in user by correct credentials', async () => {
        const { user, rawPassword } = await createAuthUser()

        const response = await global.testRequest
            .get('/login')
            .auth(user.email, rawPassword)

        const decodedToken = verifyToken(response.body.token)

        expect(response.status).toBe(200)
        expect(response.body.user.id).toBe(user.id)
        expect(response.body.user.email).toBe(user.email)
        expect(response.body.user.password).toBeFalsy()
        expect(decodedToken.sub).toBe(user.id)
    })

    it('should update the logged in user data', async () => {
        const { token } = await createAuthUser()

        const newEmail = 'marcos+1@mail.com'

        const response = await global.testRequest
            .put('/me')
            .set('Authorization', `Bearer ${token}`)
            .send({ email: newEmail })

        expect(response.status).toBe(200)
        expect(response.body).toEqual(
            expect.objectContaining({ email: newEmail })
        )
    })

    it('should delete the logged in user', async () => {
        const { user, token } = await createAuthUser()

        const response = await global.testRequest
            .delete('/me')
            .set('Authorization', `Bearer ${token}`)

        expect(response.status).toBe(200)
        await expect(
            prisma.user.findUnique({ where: { id: user.id } })
        ).resolves.toBeNull()
    })
})
